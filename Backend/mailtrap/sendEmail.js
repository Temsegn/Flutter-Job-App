// utils/sendEmail.js
import { transport, sender } from "./mailConfig.js";

// Send verification email
export const sendVerificationEmail = async ( verificationCode) => {
  const htmlTemplate = `
    <h2>Email Verification</h2>
    <p>Your verification code is:</p>
    <h3>${verificationCode}</h3>
  `;

  await transport.sendMail({
    from: `"${sender.name}" <${sender.address}>`,
    to: "tommr2323@gmail.com",
    subject: "Your Verification Code",
    text: `Your verification code is: ${verificationCode}`,
    html: htmlTemplate,
  });
};

// Send welcome email
export const sendWelcomeEmail = async ( name) => {
  const htmlTemplate = `
    <h2>Welcome, ${name}!</h2>
    <p>Thanks for joining our platform. We’re glad to have you!</p>
  `;

  await transport.sendMail({
    from: `"${sender.name}" <${sender.address}>`,
    to: "tommr2323@gmail.com",
    subject: "Welcome to the App!",
    text: `Hi ${name}, welcome to our platform!`,
    html: htmlTemplate,
  });
};

// Password reset request
export const sendPasswordResetEmail = async (email, resetLink) => {
  const htmlTemplate = `
    <h2>Password Reset</h2>
    <p>Click the button below to reset your password:</p>
    <a href="${resetLink}" style="background-color:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
  `;

  await transport.sendMail({
    from: `"${sender.name}" <${sender.address}>`,
    to: email,
    subject: "Password Reset Request",
    text: `Click here to reset your password: ${resetLink}`,
    html: htmlTemplate,
  });
};

// Password reset success
export const sendPasswordResetSuccessEmail = async (email) => {
  const htmlTemplate = `
    <h2>Password Successfully Reset</h2>
    <p>Your password has been changed. If this wasn't you, contact support.</p>
  `;

  await transport.sendMail({
    from: `"${sender.name}" <${sender.address}>`,
    to: email,
    subject: "Password Reset Successful",
    text: `Your password was reset. If this wasn't you, contact support immediately.`,
    html: htmlTemplate,
  });
};
