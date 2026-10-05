import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import Donation from '../models/Donation.js'
import Food from '../models/Food.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, emitDonation, validationError } from '../utils/http.js'

const router = Router()
const populateDonation = (query) => query.populate('food').populate('donor', 'name email phone address').populate('recipient', 'name email phone address')
const participantFilter = (user) => user.role === 'admin' ? {} : { $or: [{ donor: user._id }, { recipient: user._id }] }

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const donations = await populateDonation(Donation.find(participantFilter(req.user)).select('+verificationCode').sort({ createdAt: -1 }).limit(100))
  const response = donations.map((donation) => {
    const item = donation.toObject()
    if (String(donation.donor._id) !== String(req.user._id) && req.user.role !== 'admin') delete item.verificationCode
    return item
  })
  res.json({ donations: response })
}))

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const donation = await populateDonation(Donation.findById(req.params.id).select('+verificationCode'))
  if (!donation) return res.status(404).json({ message: 'Donation not found.' })
  if (req.user.role !== 'admin' && ![String(donation.donor._id), String(donation.recipient._id)].includes(String(req.user._id))) {
    return res.status(403).json({ message: 'You are not part of this donation.' })
  }
  const item = donation.toObject()
  if (String(donation.donor._id) !== String(req.user._id) && req.user.role !== 'admin') delete item.verificationCode
  res.json({ donation: item })
}))

router.patch('/:id/status', authenticate, authorize('ngo'), [
  body('status').isIn(['pickup_started']).withMessage('The only allowed status update is pickup_started.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid donation status.', errors: validationError(errors) })
  const donation = await populateDonation(Donation.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id, status: 'accepted' },
    { $set: { status: 'pickup_started' } },
    { new: true },
  ))
  if (!donation) return res.status(409).json({ message: 'This donation cannot be started. It may already have changed status.' })
  await Food.updateOne({ _id: donation.food._id }, { $set: { status: 'pickup_started' } })
  emitDonation(req.app.get('io'), donation, `Pickup started for ${donation.food.name}.`)
  res.json({ message: 'Pickup started. Ask the donor for the verification code when you arrive.', donation })
}))

router.patch('/:id/verify', authenticate, authorize('ngo'), [
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the donor’s 6-digit pickup code.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Enter the donor’s 6-digit pickup code.', errors: validationError(errors) })
  const donation = await populateDonation(Donation.findOne({ _id: req.params.id, recipient: req.user._id, status: 'pickup_started' }).select('+verificationCode'))
  if (!donation) return res.status(409).json({ message: 'Only an active pickup can be verified.' })
  if (donation.verificationCode !== req.body.code) return res.status(400).json({ message: 'That pickup code does not match. Check with the donor and try again.' })
  donation.status = 'delivered'
  donation.deliveredAt = new Date()
  await donation.save()
  await Food.updateOne({ _id: donation.food._id }, { $set: { status: 'delivered' } })
  emitDonation(req.app.get('io'), donation, `${donation.food.name} was delivered. Thank you for making a difference!`)
  res.json({ message: 'Pickup verified. This food donation is now delivered!', donation })
}))

export default router
