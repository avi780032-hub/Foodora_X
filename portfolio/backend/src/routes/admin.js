import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import User from '../models/User.js'
import Food from '../models/Food.js'
import Donation from '../models/Donation.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, emitDonation } from '../utils/http.js'
import AuditLog from '../models/AuditLog.js'
import { writeAudit } from '../utils/audit.js'
import Notification from '../models/Notification.js'
import { sendNotificationChannels } from '../services/email.js'

const router = Router()
router.use(authenticate, authorize('admin'))

router.get('/users', asyncHandler(async (_req, res) => {
  const users = await User.find().select('name email phone role address city verified active createdAt').sort({ createdAt: -1 }).limit(500)
  res.json({ users })
}))

router.get('/donors', asyncHandler(async (_req, res) => {
  const [donors, summaries] = await Promise.all([
    User.find({ role: 'donor' })
      .select('name email phone whatsappNumber city address location verified active createdAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
    Food.aggregate([
      { $group: { _id: '$donor', listingCount: { $sum: 1 }, totalQuantity: { $sum: '$quantity' }, latestListingAt: { $max: '$createdAt' } } },
    ]),
  ])
  const summaryByDonor = new Map(summaries.map((summary) => [String(summary._id), summary]))
  res.json({
    donors: donors.map((donor) => ({
      ...donor,
      ...(summaryByDonor.get(String(donor._id)) || { listingCount: 0, totalQuantity: 0, latestListingAt: null }),
    })),
  })
}))

router.get('/donors/:id/foods', [
  param('id').isMongoId().withMessage('Invalid donor account ID.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  const donor = await User.findOne({ _id: req.params.id, role: 'donor' }).select('_id')
  if (!donor) return res.status(404).json({ message: 'Donor account not found.' })
  const records = await Food.find({ donor: donor._id })
    .select('name category quantity quantityUnit city address location status preparedAt pickupTime expiryTime createdAt')
    .sort({ createdAt: -1 })
    .limit(501)
    .lean()
  res.json({ foods: records.slice(0, 500), hasMore: records.length > 500 })
}))

router.patch('/users/:id/status', [
  param('id').isMongoId().withMessage('Invalid account ID.'),
  body('active').isBoolean().withMessage('Account status must be active or inactive.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot deactivate your own administrator account.' })
  const member = await User.findByIdAndUpdate(req.params.id, { $set: { active: req.body.active } }, { new: true })
    .select('name email role active verified')
  if (!member) return res.status(404).json({ message: 'Account not found.' })
  await writeAudit(req.user._id, member.active ? 'account_activated' : 'account_deactivated', 'user', member._id, member.email)
  res.json({ message: `Account ${member.active ? 'reactivated' : 'deactivated'}.`, user: member })
}))

router.get('/ngos', asyncHandler(async (_req, res) => {
  const ngos = await User.find({ role: 'ngo' }).select('name email phone address verified createdAt location priority preferredCategories quantityNeeded').sort({ verified: 1, createdAt: 1 })
  res.json({ ngos })
}))

router.patch('/food/:id/status', [
  param('id').isMongoId().withMessage('Invalid food listing ID.'),
  body('status').equals('cancelled').withMessage('Admin can cancel an active listing.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  const food = await Food.findOneAndUpdate(
    { _id: req.params.id, status: { $nin: ['delivered', 'cancelled'] } },
    { $set: { status: 'cancelled' } },
    { new: true },
  )
  if (!food) return res.status(409).json({ message: 'This food listing is already complete, cancelled, or unavailable.' })
  const donation = await Donation.findOneAndUpdate(
    { food: food._id, status: { $in: ['accepted', 'pickup_started'] } },
    { $set: { status: 'cancelled' } },
    { new: true },
  ).populate('food').populate('donor', 'name').populate('recipient', 'name')
  if (donation) await emitDonation(req.app.get('io'), donation, `The ${food.name} listing was cancelled by an administrator.`)
  else req.app.get('io').emit('food:updated', { foodId: String(food._id), status: food.status })
  await writeAudit(req.user._id, 'food_cancelled', 'food', food._id, food.name)
  res.json({ message: 'Food listing cancelled.', food })
}))

router.patch('/ngos/:id/verify', [
  param('id').isMongoId().withMessage('Invalid organization ID.'),
  body('priority').optional().isInt({ min: 1, max: 5 }).withMessage('Priority must be a number from 1 to 5.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  const update = { verified: true }
  if (req.body.priority !== undefined) update.priority = Number(req.body.priority)
  const ngo = await User.findOneAndUpdate({ _id: req.params.id, role: 'ngo' }, { $set: update }, { new: true })
    .select('name email phone address role verified createdAt')
  if (!ngo) return res.status(404).json({ message: 'NGO account not found.' })
  await writeAudit(req.user._id, 'ngo_verified', 'user', ngo._id, ngo.name)
  const message = 'Your organization has been verified. You can now accept food donations.'
  await Notification.create({ user: ngo._id, message, type: 'system' })
  await sendNotificationChannels({ email: ngo.email, phone: ngo.phone || ngo.whatsappNumber, subject: 'FoodoraX organization verified', message })
  req.app.get('io').to(`user:${ngo._id}`).emit('notification', { message, type: 'system' })
  res.json({ message: 'NGO verified successfully.', ngo })
}))

router.get('/analytics', asyncHandler(async (_req, res) => {
  const [users, donors, ngos, verifiedNgos, pendingNgos, totalDonations, activeDonations, completedDonations, foodQuantity] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'ngo' }),
    User.countDocuments({ role: 'ngo', verified: true }),
    User.countDocuments({ role: 'ngo', verified: false }),
    Food.countDocuments(),
    Food.countDocuments({ status: { $in: ['listed', 'matched', 'accepted', 'pickup_started'] } }),
    Donation.countDocuments({ status: 'delivered' }),
    Food.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$quantity' } } }]),
  ])
  const mealsRescued = foodQuantity[0]?.total || 0
  res.json({
    analytics: {
      users, donors, ngos, verifiedNgos, pendingNgos, totalDonations,
      activeDonations, completedDonations, mealsRescued,
      estimatedKgSaved: Math.round(mealsRescued * 0.5),
      estimatedPeopleSupported: mealsRescued,
    },
  })
}))

router.get('/analytics/monthly', asyncHandler(async (_req, res) => {
  const monthly = await Donation.aggregate([
    { $match: { status: 'delivered', deliveredAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$deliveredAt' } }, donations: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  res.json({ monthly })
}))

router.get('/reports/:type.csv', asyncHandler(async (req, res) => {
  const escapeCell = (value) => {
    const text = String(value ?? '')
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  let header
  let rows
  if (req.params.type === 'food') {
    const foods = await Food.find().populate('donor', 'name email phone city').sort({ createdAt: -1 }).limit(10000).lean()
    header = ['Food', 'Category', 'Quantity', 'Unit', 'Status', 'Pickup address', 'City', 'Pickup coordinates', 'Expiry', 'Donor', 'Donor email', 'Donor phone']
    rows = foods.map((food) => [
      food.name, food.category, food.quantity, food.quantityUnit, food.status, food.address, food.city,
      food.location?.coordinates?.join(', '), food.expiryTime?.toISOString(),
      food.donor?.name, food.donor?.email, food.donor?.phone,
    ])
  } else if (req.params.type === 'donations') {
    const donations = await Donation.find().populate('food', 'name quantity quantityUnit').populate('donor', 'name').populate('recipient', 'name').sort({ createdAt: -1 }).limit(10000).lean()
    header = ['Food', 'Quantity', 'Donor', 'NGO', 'Status', 'Pickup time', 'Delivered at']
    rows = donations.map((donation) => [donation.food?.name, donation.food?.quantity, donation.donor?.name, donation.recipient?.name, donation.status, donation.pickupTime?.toISOString(), donation.deliveredAt?.toISOString()])
  } else if (req.params.type === 'audit') {
    const logs = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(10000).lean()
    header = ['Time', 'Actor', 'Action', 'Target type', 'Target ID', 'Details']
    rows = logs.map((log) => [log.createdAt.toISOString(), log.actor?.email, log.action, log.targetType, log.targetId, log.details])
  } else return res.status(400).json({ message: 'Choose food, donations, or audit as the report type.' })
  await writeAudit(req.user._id, 'report_exported', 'report', req.params.type, `${rows.length} rows`)
  res.type('text/csv').attachment(`foodorax-${req.params.type}-${new Date().toISOString().slice(0, 10)}.csv`)
  res.send([header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n'))
}))

router.get('/audit', asyncHandler(async (_req, res) => {
  const logs = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(200)
  res.json({ logs })
}))

export default router
