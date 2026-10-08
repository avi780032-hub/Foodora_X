import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import Donation from '../models/Donation.js'
import Food from '../models/Food.js'
import User from '../models/User.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, emitDonation, validationError } from '../utils/http.js'

const router = Router()
const populateDonation = (query) => query
  .populate('food')
  .populate('donor', 'name email phone address city location verified')
  .populate('recipient', 'name email phone address city location verified')
  .populate('volunteer', 'name email phone city location whatsappNumber active')
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

router.get('/volunteers', authenticate, asyncHandler(async (req, res) => {
  const cityFilter = req.query.city ? { city: new RegExp(`^${String(req.query.city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } : {}
  const volunteers = await User.find({ role: 'volunteer', active: true, ...cityFilter }).select('name email phone whatsappNumber city volunteer').sort({ name: 1 })
  res.json({ volunteers })
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

router.patch('/:id/assign-volunteer', authenticate, [
  body('volunteerId').isMongoId().withMessage('Choose a valid volunteer.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid volunteer selection.', errors: validationError(errors) })
  const donation = await Donation.findOne({
    _id: req.params.id,
    status: { $in: ['accepted', 'pickup_started'] },
    $or: [{ donor: req.user._id }, { recipient: req.user._id }, { donor: req.user._id }],
  }).populate('food')
  if (!donation) return res.status(409).json({ message: 'This donation cannot be assigned to a volunteer right now.' })
  const volunteer = await User.findOne({ _id: req.body.volunteerId, role: 'volunteer', active: true })
  if (!volunteer) return res.status(404).json({ message: 'Volunteer not found or inactive.' })
  donation.volunteer = volunteer._id
  donation.pickupStatus = 'assigned'
  donation.routeSummary = `Pickup scheduled for ${donation.food.name} in ${volunteer.city || 'your city'}.`
  donation.routePoints = donation.routePoints || []
  if (donation.routePoints.length === 0 && volunteer.location?.coordinates?.length === 2) {
    donation.routePoints.push({ coordinates: volunteer.location.coordinates, status: 'assigned', capturedAt: new Date() })
  }
  await donation.save()
  await emitDonation(req.app.get('io'), donation, `A volunteer pickup has been assigned for ${donation.food.name}.`)
  res.json({ message: 'Volunteer assigned successfully.', volunteer, donation })
}))

router.get('/:id/route', authenticate, asyncHandler(async (req, res) => {
  const donation = await populateDonation(Donation.findById(req.params.id))
  if (!donation) return res.status(404).json({ message: 'Donation not found.' })
  if (req.user.role !== 'admin' && ![String(donation.donor._id), String(donation.recipient._id), String(donation.volunteer?._id)].includes(String(req.user._id))) {
    return res.status(403).json({ message: 'You are not allowed to view this route.' })
  }
  res.json({ route: { liveLocation: donation.liveLocation || [], routePoints: donation.routePoints || [], routeSummary: donation.routeSummary || '', pickupStatus: donation.pickupStatus } })
}))

router.patch('/:id/route', authenticate, [
  body('location').isArray({ min: 2, max: 2 }).withMessage('Location must be a [longitude, latitude] pair.'),
  body('status').optional().isIn(['assigned', 'en_route', 'drop_off', 'delivered']).withMessage('Invalid route status.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid route payload.', errors: validationError(errors) })
  const donation = await Donation.findOne({
    _id: req.params.id,
    $or: [{ donor: req.user._id }, { recipient: req.user._id }, { volunteer: req.user._id }],
  })
  if (!donation) return res.status(404).json({ message: 'Route not found for this user.' })
  const [lng, lat] = req.body.location
  donation.liveLocation = [Number(lng), Number(lat)]
  donation.routePoints = donation.routePoints || []
  donation.routePoints.push({ coordinates: [Number(lng), Number(lat)], status: req.body.status || donation.pickupStatus || 'en_route', capturedAt: new Date() })
  donation.pickupStatus = req.body.status || donation.pickupStatus || 'en_route'
  donation.routeSummary = donation.routeSummary || `Volunteer en route for ${donation.food ? 'this delivery' : 'the pickup'}.`
  await donation.save()
  await emitDonation(req.app.get('io'), donation, `Volunteer route updated for delivery ${donation._id}.`)
  res.json({ message: 'Route updated successfully.', route: { liveLocation: donation.liveLocation, routePoints: donation.routePoints, pickupStatus: donation.pickupStatus } })
}))

router.patch('/:id/status', authenticate, authorize('ngo'), [
  body('status').isIn(['pickup_started']).withMessage('The only allowed status update is pickup_started.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid donation status.', errors: validationError(errors) })
  const donation = await populateDonation(Donation.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id, status: 'accepted' },
    { $set: { status: 'pickup_started', pickupStatus: 'en_route' } },
    { new: true },
  ))
  if (!donation) return res.status(409).json({ message: 'This donation cannot be started. It may already have changed status.' })
  await Food.updateOne({ _id: donation.food._id }, { $set: { status: 'pickup_started' } })
  await emitDonation(req.app.get('io'), donation, `Pickup started for ${donation.food.name}.`)
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
  donation.pickupStatus = 'delivered'
  donation.deliveredAt = new Date()
  await donation.save()
  await Food.updateOne({ _id: donation.food._id }, { $set: { status: 'delivered' } })
  await emitDonation(req.app.get('io'), donation, `${donation.food.name} was delivered. Thank you for making a difference!`)
  res.json({ message: 'Pickup verified. This food donation is now delivered!', donation })
}))

router.patch('/:id/pickup-time', authenticate, [
  body('pickupTime').isISO8601().withMessage('Enter a valid pickup time.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Enter a valid pickup time.', errors: validationError(errors) })
  const pickupTime = new Date(req.body.pickupTime)
  if (pickupTime <= new Date()) return res.status(400).json({ message: 'Pickup time must be in the future.' })
  const donation = await populateDonation(Donation.findOne({
    _id: req.params.id,
    status: 'accepted',
    $or: [{ donor: req.user._id }, { recipient: req.user._id }],
  }))
  if (!donation) return res.status(409).json({ message: 'Pickup time can only be changed for an accepted donation.' })
  if (pickupTime >= new Date(donation.food.expiryTime)) {
    return res.status(400).json({ message: 'Pickup time must be before the food expires.' })
  }
  donation.pickupTime = pickupTime
  await donation.save()
  await Food.updateOne({ _id: donation.food._id }, { $set: { pickupTime } })
  await emitDonation(req.app.get('io'), donation, `Pickup time for ${donation.food.name} was changed to ${pickupTime.toLocaleString()}.`)
  res.json({ message: 'Pickup time updated.', donation })
}))

export default router
