import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import Notification from '../models/Notification.js'
import { asyncHandler } from '../utils/http.js'

const router = Router()

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Notification.countDocuments({ user: req.user._id, readAt: null }),
  ])
  res.json({ notifications, unreadCount })
}))

router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } })
  res.json({ message: 'All notifications marked as read.' })
}))

router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { readAt: new Date() } },
    { new: true },
  )
  if (!notification) return res.status(404).json({ message: 'Notification not found.' })
  res.json({ notification })
}))

export default router
