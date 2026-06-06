const wrapTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SaaSApp</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f0f1a;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #0f0f1a;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #1a1a2e;
      border: 1px solid #2d2d4e;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    }
    .logo {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
      text-decoration: none;
      margin-bottom: 24px;
      display: inline-block;
    }
    h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      background-color: #6366f1;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 8px;
      margin: 10px 0 24px;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
    }
    .btn:hover {
      background-color: #4f46e5;
    }
    .footer {
      border-top: 1px solid #2d2d4e;
      padding-top: 20px;
      margin-top: 24px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <a href="#" class="logo">⚡ SaaSApp</a>
      ${content}
      <div class="footer">
        © ${new Date().getFullYear()} SaaSApp. All rights reserved.<br>
        If you have any questions, contact our support team.
      </div>
    </div>
  </div>
</body>
</html>
`;

exports.getWelcomeEmail = (name, verifyUrl) => wrapTemplate(`
  <h1>Welcome to SaaSApp, ${name}!</h1>
  <p>Thanks for signing up. We're excited to have you on board! To get started and unlock all the features of your account, please verify your email address by clicking the button below.</p>
  <div style="text-align: center;">
    <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
  </div>
  <p>If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="word-break: break-all;"><a href="${verifyUrl}" style="color: #a5b4fc;">${verifyUrl}</a></p>
`);

exports.getEmailVerificationEmail = (name, verifyUrl) => wrapTemplate(`
  <h1>Verify Your Email Address</h1>
  <p>Hello ${name},</p>
  <p>Please confirm your email address by clicking the button below to ensure full access to your account.</p>
  <div style="text-align: center;">
    <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
  </div>
  <p>If you did not request this, you can safely ignore this email.</p>
`);

exports.getPasswordResetEmail = (name, resetUrl) => wrapTemplate(`
  <h1>Reset Your Password</h1>
  <p>Hello ${name},</p>
  <p>We received a request to reset your password. Click the button below to choose a new password. This link is secure and will expire in 10 minutes.</p>
  <div style="text-align: center;">
    <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
  </div>
  <p>If you did not make this request, please ignore this email; your password will remain unchanged.</p>
`);

exports.getPaymentFailedEmail = (name, billingUrl) => wrapTemplate(`
  <h1>Important: Payment Failed</h1>
  <p>Hello ${name},</p>
  <p>We were unable to process the payment for your subscription. To keep your account active and prevent service disruptions, please update your billing details using the link below.</p>
  <div style="text-align: center;">
    <a href="${billingUrl}" class="btn" target="_blank">Update Billing Info</a>
  </div>
  <p>If you have already resolved this issue, please disregard this email.</p>
`);
