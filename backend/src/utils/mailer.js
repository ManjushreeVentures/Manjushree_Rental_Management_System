import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter object using SMTP transport
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // fallback to Gmail, but they might use outlook
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true' || false, 
  auth: {
    user: process.env.SMTP_USER || 'manoj.c@manjushreeventures.com', 
    pass: process.env.SMTP_PASS, // User must add SMTP_PASS to their .env file
  },
});

export const sendReminderEmail = async (toEmail, tenantName, invoicesList, totalOutstanding) => {
  if (!process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP_PASS is missing in .env! Emails cannot be sent.');
    return false;
  }

  const invoiceRows = invoicesList.map(inv => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${inv.category}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${inv.billing_month}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${new Date(inv.due_date).toLocaleDateString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">
        ₹ ${Number(inv.outstanding_balance).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Reminder</h2>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; margin-bottom: 24px;">Dear <strong>${tenantName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          This is a polite reminder that your account currently has an outstanding balance of 
          <strong style="color: #dc2626; font-size: 18px;">₹ ${Number(totalOutstanding).toLocaleString('en-IN')}</strong>.
        </p>

        <h3 style="color: #0f172a; margin-top: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Overdue Invoices Summary</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; color: #64748b;">
              <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">Category</th>
              <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">Billing Month</th>
              <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">Due Date</th>
              <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">Amount Due</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceRows}
          </tbody>
        </table>

        <p style="font-size: 14px; color: #64748b; margin-top: 32px; line-height: 1.6;">
          Please process the payment at your earliest convenience to avoid any late fees. If you have already made the payment, please disregard this notice.
        </p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          <strong>Manjushree Ventures</strong><br>
          <a href="mailto:manoj.c@manjushreeventures.com" style="color: #2563eb; text-decoration: none;">manoj.c@manjushreeventures.com</a>
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: '"Manjushree Ventures" <manoj.c@manjushreeventures.com>',
      to: toEmail,
      subject: `Payment Reminder - Outstanding Balance of ₹ ${Number(totalOutstanding).toLocaleString('en-IN')}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Error sending email to', toEmail, error);
    return false;
  }
};
