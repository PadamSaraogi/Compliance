import { getAdminSupabase } from './supabase';
import { sendEmail } from './email';

/**
 * Sends a real-time notification email when a filing is updated.
 */
export async function sendUpdateNotification(
  filingId: string, 
  action: 'status_change' | 'file_uploaded' | 'note_added',
  details: {
    oldStatus?: string;
    newStatus?: string;
    fileName?: string;
    noteTitle?: string;
    updatedBy: string;
  }
) {
  const supabase = getAdminSupabase();

  // 1. Get recipients from settings
  const { data: settings } = await supabase.from('app_settings').select('*');
  const recipientStr = settings?.find(s => s.key === 'update_notification_recipients')?.value || '';
  const recipients = recipientStr.split(',').map((e: string) => e.trim()).filter(Boolean);

  if (recipients.length === 0) return;

  // 2. Get filing details for context
  const { data: filing } = await supabase
    .from('company_filings')
    .select('title, deadline, master_filings(name)')
    .eq('id', filingId)
    .single();

  if (!filing) return;

  // 3. Construct Email Content
  let subject = `[Compliance Update] ${filing.title}`;
  let actionDesc = '';

  if (action === 'status_change') {
    subject = `[Status Change] ${filing.title} -> ${details.newStatus}`;
    actionDesc = `The status was changed from <strong>${details.oldStatus}</strong> to <strong>${details.newStatus}</strong>.`;
  } else if (action === 'file_uploaded') {
    subject = `[File Uploaded] New document for ${filing.title}`;
    actionDesc = `A new file <strong>"${details.fileName}"</strong> has been uploaded.`;
  } else if (action === 'note_added') {
    subject = `[Note Added] ${filing.title}`;
    actionDesc = `A new note was added: "${details.noteTitle}"`;
  }

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 20px; color: white;">
        <h2 style="margin: 0; font-size: 18px;">Compliance Alert</h2>
      </div>
      <div style="padding: 24px;">
        <p style="margin-top: 0;">Hi,</p>
        <p>${actionDesc}</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; font-size: 12px; padding-bottom: 4px;">FILING</td>
            </tr>
            <tr>
              <td style="font-weight: 600; padding-bottom: 12px;">${filing.title}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-size: 12px; padding-bottom: 4px;">DEADLINE</td>
            </tr>
            <tr>
              <td style="font-weight: 600; padding-bottom: 12px;">${new Date(filing.deadline).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-size: 12px; padding-bottom: 4px;">UPDATED BY</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">${details.updatedBy}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/filings/${filingId}" 
             style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View Filing Details
          </a>
        </div>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">
        This is an automated real-time notification from your Compliance Tracker.
      </div>
    </div>
  `;

  await sendEmail({
    to: recipients,
    subject,
    html: htmlContent
  });
}
