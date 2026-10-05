import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import User from '../models/User.js'
import Food from '../models/Food.js'
import Donation from '../models/Donation.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, emitDonation } from '../utils/http.js'

const router = Router()
router.use(authenticate, authorize('admin'))

router.get('/users', asyncHandler(async (_req, res) => {
  const users = await User.find().select('name email phone role address verified active createdAt').sort({ createdAt: -1 }).limit(500)
  res.json({ users })
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
  if (donation) emitDonation(req.app.get('io'), donation, `The ${food.name} listing was cancelled by an administrator.`)
  else req.app.get('io').emit('food:updated', { foodId: String(food._id), status: food.status })
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
  req.app.get('io').to(`user:${ngo._id}`).emit('notification', { message: 'Your organization has been verified. You can now accept food donations.' })
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

export default router
