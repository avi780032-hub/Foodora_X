import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { sendNotificationChannels } from '../services/email.js'

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function validationError(errors) {
  return errors.array({ onlyFirstError: true }).map(({ path, msg }) => ({ field: path, message: msg }))
}

export async function emitDonation(io, donation, message) {
  const detail = {
    donationId: String(donation._id),
    foodId: String(donation.food?._id || donation.food),
    status: donation.status,
  }
  const userIds = [...new Set([donation.donor?._id || donation.donor, donation.recipient?._id || donation.recipient].filter(Boolean).map(String))]
  await Notification.insertMany(userIds.map((user) => ({ user, message, type: 'donation' })))
  const users = await User.find({ _id: { $in: userIds } }).select('email phone whatsappNumber')
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit('notification', { ...detail, message })
  }
  io.emit('food:updated', detail)
  await Promise.all(users.map((user) => sendNotificationChannels({
    email: user.email,
    phone: user.phone || user.whatsappNumber,
    subject: 'FoodoraX donation update',
    message,
  })))
}
