import { getAdminSupabase } from './supabase';
import { differenceInDays, format } from 'date-fns';
import { sendEmail } from './email';

export async function processReminders() {
  const supabase = getAdminSupabase();

  const { data: settings } = await supabase.from('app_settings').select('*');
  const recipientStr = settings?.find(s => s.key === 'reminder_recipients')?.value || '';
  const recipients = recipientStr.split(',').map(e => e.trim()).filter(Boolean);
  
  if (recipients.length === 0) return { success: false, message: 'No recipients configured' };

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

  let emailsSent = 0;
  
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

      const allEmails = [...recipients];
      items.forEach(i => {
        if (i.users?.email && !allEmails.includes(i.users.email)) {
          allEmails.push(i.users.email); 
        }
      });
      
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
