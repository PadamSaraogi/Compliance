import { getAdminSupabase } from './supabase';
import { differenceInDays, format } from 'date-fns';
import { sendEmail } from './email';

export async function processReminders() {
  const supabase = getAdminSupabase();

  const { data: settings } = await supabase.from('app_settings').select('*');
  const recipientStr = settings?.find(s => s.key === 'reminder_recipients')?.value || '';
  const reminderRecipients = recipientStr.split(',').map((e: string) => e.trim()).filter(Boolean);
  
  const updateRecipientStr = settings?.find(s => s.key === 'update_notification_recipients')?.value || '[]';
  let granularRecipients: Array<{email: string; alerts: Record<string, boolean>}> = [];
  try {
     granularRecipients = JSON.parse(updateRecipientStr);
  } catch (e: any) {
     const emails = updateRecipientStr.split(',').map((e: string) => e.trim()).filter(Boolean);
     granularRecipients = emails.map((email: string) => ({ email, alerts: { days30: true, days7: true, days3: true, days2: true, days1: true, completed: true } }));
  }
  
  let emailsSent = 0;

  // 1. Send Unconditional Daily Digest
  if (reminderRecipients.length > 0) {
      const digestSuccess = await sendDailyDigest(supabase, reminderRecipients);
      if (digestSuccess) emailsSent++;
  }

  // 2. Fetch specific active filings for Countdown Alerts

  const { data: filings } = await supabase
    .from('company_filings')
    .select('*, master_filings(name, compliance_categories(name, color)), users!assigned_to(full_name, email)')
    .neq('status', 'Done')
    .neq('status', 'NA');

  if (!filings || filings.length === 0) return { success: true, processed: 0 };

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const intervals = [30, 7, 3, 2, 1];
  const summaries: Record<number, any[]> = { 30: [], 7: [], 3: [], 2: [], 1: [] };

  for (const filing of filings) {
    const deadline = new Date(filing.deadline);
    const daysLeft = differenceInDays(deadline, today);

    if (intervals.includes(daysLeft)) {
      const reminderType = `${daysLeft}_days`;
      const { data: existing } = await supabase
        .from('reminder_log')
        .select('id')
        .eq('company_filing_id', filing.id)
        .eq('reminder_type', reminderType)
        .single();
        
      if (!existing) {
        summaries[daysLeft].push(filing);
      }
    }
  }

  // Execute batch sending logic
  
  for (const interval of intervals) {
    const items = summaries[interval];
    if (items.length > 0) {
      let subject = '';
      if (interval === 30) subject = `[Compliance] 30-day advance notice — ${items.length} filings due next month`;
      if (interval === 7) subject = `[Compliance] ⚠ 7 days left — ${items.length} filings due this week`;
      if (interval === 3) subject = `[Compliance] 🔴 URGENT — ${items.length} filings due in 3 days`;
      if (interval === 2) subject = `[Compliance] 🔴 CRITICAL — ${items.length} filings due in 2 days`;
      if (interval === 1) subject = `[Compliance] 🚨 FINAL REMINDER — ${items.length} filings due TOMORROW`;

      const htmlRows = items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${item.title}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${format(new Date(item.deadline), 'dd MMM yyyy')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${interval} days</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.users?.full_name || 'Unassigned'}</td>
        </tr>
      `).join('');

      let penaltyNotice = '';
      if (interval <= 3) {
        penaltyNotice = `<div style="background-color: #fef2f2; color: #991b1b; padding: 15px; border-left: 4px solid #dc2626; margin-bottom: 20px;">
          <strong>⚠ Important:</strong> Late fees start applying immediately after the deadline. Please ensure these are filed to avoid penalties.
        </div>`;
      }

      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0f1f3d;">Compliance Notice</h2>
          <p>You have <strong>${items.length}</strong> filings that require your attention.</p>
          ${penaltyNotice}
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f8fafc; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Filing</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Deadline</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Time Left</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
          </table>
          <div style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background-color: #0f1f3d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Open Compliance Dashboard →</a>
          </div>
        </div>
      `;

      const allEmails: string[] = [];
      
      // Add granular configuration subscribers who checked the box for this specific interval
      granularRecipients.forEach(sub => {
          if (sub.alerts[`days${interval}`] && !allEmails.includes(sub.email)) {
              allEmails.push(sub.email);
          }
      });

      // Add assigned users
      items.forEach(i => {
        if (i.users?.email && !allEmails.includes(i.users.email)) {
          allEmails.push(i.users.email); 
        }
      });
      
      if (allEmails.length === 0) continue; // No one subscribed for this specific interval
      
      const success = await sendEmail({ to: allEmails, subject, html: htmlContent });
      
      if (success) {
        emailsSent++;
        const logs = items.map(item => ({
          company_filing_id: item.id,
          sent_to: allEmails,
          reminder_type: `${interval}_days`,
          email_subject: subject,
          success: true
        }));
        await supabase.from('reminder_log').insert(logs);
      }
    }
  }

  return { success: true, emailsSent };
}

async function sendDailyDigest(supabase: any, recipients: string[]) {
   const now = new Date();
   const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
   const fyStart = new Date(currentYear, 3, 1).toISOString();
   const fyEnd = new Date(currentYear + 1, 2, 31, 23, 59, 59).toISOString();

   let from = 0; const step = 1000;
   let total = 0; let completed = 0; let overdue = 0; let due30 = 0;
   
   now.setHours(0,0,0,0);
   const thirtyDaysFromNow = new Date(now);
   thirtyDaysFromNow.setDate(now.getDate() + 30);

   while(true) {
       const { data } = await supabase.from('company_filings').select('deadline, status').range(from, from + step - 1).neq('status', 'NA');
       if (!data || data.length === 0) break;
       for (const f of data) {
           const d = new Date(f.deadline);
           const isDone = f.status === 'Done';
           if (d >= new Date(fyStart) && d <= new Date(fyEnd)) total++;
           if (isDone) completed++; 
           if (f.status === 'Overdue' || (!isDone && d < now)) overdue++;
           if (!isDone && d >= now && d <= thirtyDaysFromNow) due30++;
       }
       if (data.length < step) break;
       from += step;
   }
   
   const healthScore = (completed + overdue + due30) > 0 ? Math.round((completed / (completed + overdue + due30)) * 100) : 100;

   const html = `
     <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
       <h2 style="color: #0f1f3d;">Daily Compliance Digest</h2>
       <p>Here is your continuous compliance overview for today.</p>
       <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
         <h1 style="color: ${healthScore >= 80 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444'}; font-size: 40px; margin: 0;">${healthScore}%</h1>
         <p style="margin-top: 5px; color: #64748b; font-weight: bold;">Current Health Score</p>
       </div>
       <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0;">
         <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px 15px;">Total Filings Tracked (This FY)</td><td style="text-align: right; font-weight: bold; padding: 12px 15px;">${total}</td></tr>
         <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px 15px;">Overdue Filings</td><td style="text-align: right; font-weight: bold; color: #ef4444; padding: 12px 15px;">${overdue}</td></tr>
         <tr><td style="padding: 12px 15px;">Due in Next 30 Days</td><td style="text-align: right; font-weight: bold; color: #f59e0b; padding: 12px 15px;">${due30}</td></tr>
       </table>
       <p style="margin-top: 20px; text-align: center; font-size: 13px; color: #64748b;">Visit the <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard">Dashboard</a> for full details.</p>
     </div>
   `;
   return await sendEmail({ to: recipients, subject: '[Compliance] Daily Operations Digest', html });
}
