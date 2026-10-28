const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Build SES client — use explicit credentials if provided, otherwise
// fall back to the SDK default credential chain (IAM role, env vars, etc.).
const sesConfig = { region: process.env.SES_REGION || 'us-east-1' };

if (process.env.SES_AWS_ACCESS_KEY_ID && process.env.SES_AWS_SECRET_ACCESS_KEY) {
  sesConfig.credentials = {
    accessKeyId: process.env.SES_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY,
  };
}

const ses = new SESClient(sesConfig);

/**
 * Send an OTP email via AWS SES.
 *
 * @param {string} to        — recipient email address
 * @param {string} otp       — the 6-digit code (plain text)
 * @param {'signup'|'reset'} purpose
 */
async function sendOtpEmail(to, otp, purpose) {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('EMAIL_FROM environment variable is not set');
  }

  const isSignup = purpose === 'signup';
  const subject = isSignup
    ? 'Verify your Learning.AI account'
    : 'Reset your Learning.AI password';

  const heading = isSignup ? 'Welcome to Learning.AI!' : 'Password Reset Request';
  const instruction = isSignup
    ? 'Please use the code below to verify your email address:'
    : 'Please use the code below to reset your password:';

  const textBody = [
    `${heading}`,
    '',
    `${instruction}`,
    '',
    `${otp}`,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');

  const htmlBody = [
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">',
    `  <h2 style="color:#FF8A00">${heading}</h2>`,
    `  <p>${instruction}</p>`,
    `  <div style="background:#f5f5f5;padding:16px;border-radius:8px;text-align:center;margin:20px 0">`,
    `    <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1A1A1A">${otp}</span>`,
    '  </div>',
    '  <p style="color:#6B7280;font-size:14px">This code expires in 10 minutes.</p>',
    '  <p style="color:#6B7280;font-size:14px">If you did not request this, you can safely ignore this email.</p>',
    '</div>',
  ].join('\n');

  const command = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: textBody, Charset: 'UTF-8' },
        Html: { Data: htmlBody, Charset: 'UTF-8' },
      },
    },
  });

  await ses.send(command);
}

module.exports = { sendOtpEmail };
