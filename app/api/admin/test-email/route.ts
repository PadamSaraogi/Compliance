import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { email } = await req.json();
    
    if (!email) return NextResponse.json({ error: 'Email address is required' }, { status: 400 });

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #0f1f3d;">Test Email Configuration</h2>
        <p>Your Compliance Tracker dashboard email settings are working successfully!</p>
      </div>
    `;

    const success = await sendEmail({ 
      to: email, 
      subject: '[Compliance Tracker] Test Email', 
      html: htmlContent 
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to send email. Check SMTP settings.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
