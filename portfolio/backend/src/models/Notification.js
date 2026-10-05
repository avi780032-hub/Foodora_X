import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true, maxlength: 300 },
  type: { type: String, enum: ['donation', 'reminder', 'system'], default: 'donation' },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
})

export default mongoose.model('Notification', notificationSchema)
