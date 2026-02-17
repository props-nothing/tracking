import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || '');
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'analytics@tracking.local';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail(options: EmailOptions) {
  const { to, subject, html, text, attachments } = options;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error };
  }
}

export async function sendReportEmail(
  recipients: string[],
  reportTitle: string,
  reportHtml: string,
  pdfBuffer?: Buffer
) {
  return sendEmail({
    to: recipients,
    subject: `📊 ${reportTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937;">${reportTitle}</h1>
        ${reportHtml}
        <hr style="border-color: #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Sent by Tracking Analytics
        </p>
      </div>
    `,
    attachments: pdfBuffer
      ? [{ filename: 'report.pdf', content: pdfBuffer }]
      : undefined,
  });
}

export async function sendGoalNotification(
  emails: string[],
  goalName: string,
  revenue?: number
) {
  return sendEmail({
    to: emails,
    subject: `🎯 Goal "${goalName}" achieved`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Goal Conversion: ${goalName}</h2>
        ${revenue ? `<p style="color: #059669; font-size: 24px; font-weight: bold;">Revenue: $${revenue.toFixed(2)}</p>` : ''}
        <p style="color: #6b7280;">A new conversion was recorded at ${new Date().toISOString()}</p>
      </div>
    `,
  });
}

export async function sendAlertNotification(
  emails: string[],
  alertName: string,
  alertType: string,
  details: string
) {
  return sendEmail({
    to: emails,
    subject: `⚠️ Alert: ${alertName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Alert: ${alertName}</h2>
        <p><strong>Type:</strong> ${alertType}</p>
        <p>${details}</p>
        <p style="color: #6b7280; font-size: 12px;">Sent by Tracking Analytics</p>
      </div>
    `,
  });
}
