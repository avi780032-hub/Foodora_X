import 'dotenv/config'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { connectDatabase } from './config/db.js'
import User from './models/User.js'
import authRoutes from './routes/auth.js'
import foodRoutes from './routes/food.js'
import donationRoutes from './routes/donations.js'
import userRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import notificationRoutes from './routes/notifications.js'
import reviewRoutes from './routes/reviews.js'
import recurringRoutes from './routes/recurring.js'
import Food from './models/Food.js'
import Notification from './models/Notification.js'
import RecurringDonation from './models/RecurringDonation.js'
import { sendNotificationEmail } from './services/email.js'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a secret of at least 32 characters in portfolio/backend/.env.')
}

const app = express()
const server = http.createServer(app)
const uploadsDirectory = fileURLToPath(new URL('../uploads/', import.meta.url))
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim())
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH'] },
})

app.set('io', io)
app.disable('x-powered-by')
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(path.resolve(uploadsDirectory), { dotfiles: 'deny', maxAge: '7d' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'FoodoraX API' }))
app.use('/api/auth', authRoutes)
app.use('/api/food', foodRoutes)
app.use('/api/donations', donationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/recurring', recurringRoutes)
app.use((_req, res) => res.status(404).json({ message: 'The requested API endpoint does not exist.' }))

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must contain valid JSON.' })
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' })
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message })
  if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' })
  if (error.name === 'CastError') return res.status(400).json({ message: 'The supplied ID or value is invalid.' })
  res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : error.message })
})

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    const { sub } = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(sub).select('_id active')
    if (!user || !user.active) return next(new Error('Active account required'))
    socket.userId = String(user._id)
    next()
  } catch {
    next(new Error('Invalid or expired authentication token'))
  }
})

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`)
})

const port = Number(process.env.PORT || 5000)
connectDatabase().then(() => {
  const sendExpiryReminders = async () => {
    const now = new Date()
    const expiresBefore = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const expiring = await Food.find({
      status: 'listed',
      expiryTime: { $gt: now, $lte: expiresBefore },
      expiryReminderSentAt: null,
    }).populate('donor', 'email')
    for (const food of expiring) {
      const claimed = await Food.updateOne(
        { _id: food._id, expiryReminderSentAt: null },
        { $set: { expiryReminderSentAt: now } },
      )
      if (!claimed.modifiedCount) continue
      const message = `${food.name} expires within 24 hours. Please confirm pickup or update the listing.`
      await Notification.create({ user: food.donor._id, message, type: 'reminder' })
      io.to(`user:${food.donor._id}`).emit('notification', { message, type: 'reminder' })
      await sendNotificationEmail(food.donor.email, 'FoodoraX expiry reminder', message)
    }
  }
  const sendRecurringReminders = async () => {
    const now = new Date()
    const due = await RecurringDonation.find({ active: true, nextReminderAt: { $lte: now } }).populate('donor', 'email')
    for (const schedule of due) {
      const nextReminderAt = new Date(now)
      nextReminderAt.setDate(nextReminderAt.getDate() + (schedule.frequency === 'weekly' ? 7 : 30))
      const claimed = await RecurringDonation.updateOne(
        { _id: schedule._id, active: true, nextReminderAt: schedule.nextReminderAt },
        { $set: { nextReminderAt } },
      )
      if (!claimed.modifiedCount) continue
      const message = `Time to confirm food safety and publish your ${schedule.frequency} ${schedule.name} donation.`
      await Notification.create({ user: schedule.donor._id, message, type: 'reminder' })
      await sendNotificationEmail(schedule.donor.email, 'FoodoraX recurring donation reminder', message)
      io.to(`user:${schedule.donor._id}`).emit('notification', { message, type: 'reminder' })
    }
  }
  sendExpiryReminders().catch((error) => console.error('Could not check expiring food:', error.message))
  sendRecurringReminders().catch((error) => console.error('Could not send recurring donation reminders:', error.message))
  setInterval(() => {
    sendExpiryReminders().catch((error) => console.error('Could not check expiring food:', error.message))
    sendRecurringReminders().catch((error) => console.error('Could not send recurring donation reminders:', error.message))
  }, 30 * 60 * 1000).unref()
  server.listen(port, () => console.log(`FoodoraX API listening on http://localhost:${port}`))
}).catch((error) => {
  console.error('Could not start FoodoraX:', error.message)
  process.exitCode = 1
})
