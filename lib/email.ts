import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail({ to, subject, html }: { to: string | string[], subject: string, html: string }) {
  if (!process.env.SMTP_USER) {
    console.warn('SMTP_USER not configured. Skipping real email send.');
    console.log(`Mock Email To: ${to} | Subject: ${subject}`);
    return true;
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Compliance Tracker'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send failed', error);
    return false;
  }
}
