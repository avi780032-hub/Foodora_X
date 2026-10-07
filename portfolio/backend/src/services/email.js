import nodemailer from 'nodemailer'

const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
const transporter = hasSmtpConfig ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}) : null

const normalizePhone = (value) => {
  if (!value) return ''
  return value.toString().replace(/[^\d+]/g, '').replace(/^00/, '+')
}

export async function sendNotificationEmail(email, subject, message) {
  if (!transporter || !email) return
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

export async function sendNotificationSMS(phone, message) {
  const number = normalizePhone(phone)
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !token || !from || !number) return
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64')
    const body = new URLSearchParams({
      To: number,
      From: from,
      Body: message,
    })
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Twilio request failed')
    }
  } catch (error) {
    console.error(`Could not send SMS notification to ${number}:`, error.message)
  }
}

export async function sendNotificationWhatsApp(phone, message) {
  const number = normalizePhone(phone)
  const from = process.env.WHATSAPP_FROM
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL
  if (!from || !webhookUrl || !number) return
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: number,
        message,
      }),
    })
  } catch (error) {
    console.error(`Could not send WhatsApp notification to ${number}:`, error.message)
  }
}

export async function sendNotificationChannels({ email, phone, message, subject = 'FoodoraX update' }) {
  await Promise.all([
    sendNotificationEmail(email, subject, message),
    sendNotificationSMS(phone, message),
    sendNotificationWhatsApp(phone, message),
  ])
}
