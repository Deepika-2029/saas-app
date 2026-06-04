const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Creates a transporter:
 *  - In production: uses real SMTP credentials from .env
 *  - In development/test: auto-creates an Ethereal (fake) account so emails
 *    never actually go out but can be previewed at the logged URL.
 */
const createTransporter = async () => {
  const hasRealCreds = process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_USER !== 'test@example.com' &&
    process.env.SMTP_PASS !== 'testpassword';

  if (hasRealCreds) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  // Fallback: Ethereal fake SMTP for local dev without credentials
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `${process.env.FROM_NAME || 'SaaSApp'} <${process.env.FROM_EMAIL || 'noreply@saasapp.com'}>`,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}`);

    // In dev, log the Ethereal preview URL so you can view the email in browser
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Preview email at: ${previewUrl}`);
        console.log(`\n📧 Email Preview URL: ${previewUrl}\n`);
      }
    }

    return info;
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    // In dev, don't throw — just warn so the main flow isn't blocked
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Email delivery skipped in dev/test mode (non-fatal)');
      return null;
    }
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
