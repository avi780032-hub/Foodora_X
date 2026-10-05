import nodemailer from 'nodemailer'

const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
const transporter = hasSmtpConfig ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}) : null

export async function sendNotificationEmail(email, subject, message) {
  if (!transporter) return
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      text: message,
    })
  } catch (error) {
    console.error(`Could not send notification email to ${email}:`, error.message)
  }
}
