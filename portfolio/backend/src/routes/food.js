import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import { randomInt, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import Food from '../models/Food.js'
import Donation from '../models/Donation.js'
import User from '../models/User.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, emitDonation, validationError } from '../utils/http.js'

const router = Router()
const categories = ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other']
const uploadsDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url))
fs.mkdirSync(uploadsDirectory, { recursive: true })
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDirectory,
    filename: (_req, file, callback) => {
      const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
      callback(null, `${randomUUID()}${extensions[file.mimetype]}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Upload a JPG, PNG, or WebP image (maximum 5 MB).')
      error.code = 'INVALID_IMAGE_TYPE'
      return callback(error)
    }
    callback(null, true)
  },
})
const distanceKm = (a, b) => {
  if (!a?.coordinates || !b?.coordinates) return null
  const [lng1, lat1] = a.coordinates, [lng2, lat2] = b.coordinates
  const rad = (n) => n * Math.PI / 180
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

router.get('/', authenticate, [
  query('minQuantity').optional().isFloat({ min: 1 }).withMessage('Minimum quantity must be positive.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid food filters.', errors: validationError(errors) })
  const filter = {}
  const validStatuses = ['listed', 'matched', 'accepted', 'pickup_started', 'delivered', 'cancelled']
  if (req.query.mine === 'true') {
    if (req.user.role !== 'donor' && req.user.role !== 'admin') return res.status(403).json({ message: 'Only donors can view their own food listings.' })
    if (req.user.role !== 'admin') filter.donor = req.user._id
  } else if (req.query.status) {
    const statuses = req.query.status.split(',').filter((value) => validStatuses.includes(value))
    if (!statuses.length) return res.status(400).json({ message: 'Choose a valid food status.' })
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses }
  } else if (req.user.role === 'donor') {
    filter.donor = req.user._id
  } else if (req.user.role !== 'admin') {
    filter.status = 'listed'
  }
  if (filter.status === 'listed' || filter.status?.$in?.includes('listed')) {
    filter.expiryTime = { $gt: new Date() }
  }
  if (req.query.category) {
    if (!categories.includes(req.query.category)) return res.status(400).json({ message: 'Choose a valid food category.' })
    filter.category = req.query.category
  }
  if (req.query.city) {
    filter.city = new RegExp(`^${String(req.query.city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  }
  if (req.query.minQuantity) filter.quantity = { $gte: Number(req.query.minQuantity) }
  if (req.query.search) {
    const escaped = req.query.search.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (escaped) filter.$or = [{ name: new RegExp(escaped, 'i') }, { description: new RegExp(escaped, 'i') }, { address: new RegExp(escaped, 'i') }]
  }
  const foods = await Food.find(filter)
    .populate('donor', 'name verified address')
    .sort({ pickupTime: 1 })
    .limit(100)
    .lean()
  res.json({ foods })
}))

router.get('/recommendations', authenticate, authorize('ngo'), [
  query('minDistanceKm').optional().isFloat({ min: 0 }).withMessage('Minimum distance cannot be negative.'),
  query('maxDistanceKm').optional().isFloat({ min: 0 }).withMessage('Maximum distance must be positive.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid distance filter.', errors: validationError(errors) })
  if (req.query.minDistanceKm !== undefined && req.query.maxDistanceKm !== undefined && Number(req.query.maxDistanceKm) < Number(req.query.minDistanceKm)) {
    return res.status(400).json({ message: 'Maximum distance must be greater than or equal to minimum distance.' })
  }
  const filter = { status: 'listed', expiryTime: { $gt: new Date() } }
  if (req.query.category) {
    if (!categories.includes(req.query.category)) return res.status(400).json({ message: 'Choose a valid food category.' })
    filter.category = req.query.category
  }
  if (req.query.city) {
    filter.city = new RegExp(`^${String(req.query.city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  }
  if (req.query.minQuantity) {
    const minQuantity = Number(req.query.minQuantity)
    if (!Number.isFinite(minQuantity) || minQuantity < 1) return res.status(400).json({ message: 'Minimum quantity must be positive.' })
    filter.quantity = { $gte: minQuantity }
  }
  if (req.query.search) {
    const escaped = req.query.search.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (escaped) filter.$or = [{ name: new RegExp(escaped, 'i') }, { description: new RegExp(escaped, 'i') }, { address: new RegExp(escaped, 'i') }]
  }
  const foods = await Food.find(filter)
    .populate('donor', 'name verified address')
    .sort({ pickupTime: 1 })
    .limit(100)
    .lean()
  const now = Date.now()
  const recommended = foods.map((food) => {
    const distance = distanceKm(req.user.location, food.location)
    const quantity = Number(food.quantity)
    const hoursLeft = Math.max(0, (new Date(food.expiryTime).getTime() - now) / 36e5)
    const quantityScore = req.user.quantityNeeded > 0
      ? Math.max(0, 25 - Math.min(25, Math.abs(quantity - req.user.quantityNeeded) / req.user.quantityNeeded * 25))
      : Math.min(quantity, 25)
    const categoryScore = !req.user.preferredCategories?.length || req.user.preferredCategories.includes(food.category) ? 20 : 0
    const distanceScore = distance === null ? 8 : Math.max(0, 35 - Math.min(distance, 35))
    const deadlineScore = Math.min(20, hoursLeft * 2)
    const priorityScore = Math.min(10, req.user.priority * 2)
    return { ...food, distanceKm: distance, matchScore: Math.min(100, Math.round(distanceScore + quantityScore + categoryScore + deadlineScore + priorityScore)) }
  }).filter((food) => {
    const minDistance = req.query.minDistanceKm === undefined ? 0 : Number(req.query.minDistanceKm)
    const maxDistance = req.query.maxDistanceKm === undefined ? Infinity : Number(req.query.maxDistanceKm)
    if (food.distanceKm === null) return minDistance === 0
    return food.distanceKm >= minDistance && food.distanceKm <= maxDistance
  }).sort((a, b) => b.matchScore - a.matchScore)
  res.json({ foods: recommended })
}))

router.post('/upload-image', authenticate, authorize('donor'), (req, res, next) => {
  imageUpload.single('image')(req, res, (error) => {
    if (error instanceof multer.MulterError || error?.code === 'INVALID_IMAGE_TYPE') {
      return res.status(400).json({ message: error.message })
    }
    if (error) return next(error)
    if (!req.file) return res.status(400).json({ message: 'Choose a JPG, PNG, or WebP image to upload.' })
    res.status(201).json({ image: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` })
  })
})

router.post('/', authenticate, authorize('donor'), [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Food name must be 2–120 characters.'),
  body('category').isIn(categories).withMessage('Choose a valid food category.'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a whole number greater than zero.'),
  body('quantityUnit').optional().isIn(['meals', 'kg', 'boxes', 'portions']).withMessage('Choose a valid quantity unit.'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
  body('image').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Food image must be a valid HTTP or HTTPS URL.'),
  body('address').trim().isLength({ min: 3, max: 240 }).withMessage('Enter a pickup address.'),
  body('preparedAt').isISO8601().withMessage('Enter a valid preparation time.'),
  body('pickupTime').isISO8601().withMessage('Enter a valid pickup time.'),
  body('expiryTime').isISO8601().withMessage('Enter a valid expiry time.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check the food listing details.', errors: validationError(errors) })
  const { name, category, quantity, quantityUnit, description, image, address, preparedAt, pickupTime, expiryTime, location, safetyChecklist } = req.body
  const donorCity = req.user.city || ''
  const preparation = new Date(preparedAt), pickup = new Date(pickupTime), expiry = new Date(expiryTime), now = new Date()
  if (preparation > now || pickup < now || preparation > pickup || expiry <= pickup) {
    return res.status(400).json({ message: 'Preparation must be in the past and before pickup; pickup must be in the future and expiry must be after pickup.' })
  }
  const safetyKeys = ['edible', 'stored', 'uncontaminated', 'preparationTimeEntered', 'expiryTimeEntered']
  if (!safetyChecklist || safetyKeys.some((key) => safetyChecklist[key] !== true)) {
    return res.status(400).json({ message: 'Confirm every food safety check before publishing.' })
  }
  let validatedLocation
  const coordinates = location?.coordinates
  if (coordinates !== undefined && !Array.isArray(coordinates)) {
    return res.status(400).json({ message: 'Location coordinates must be an array.' })
  }
  if (coordinates?.length) {
    const [longitude, latitude] = coordinates.map(Number)
    if (coordinates.length !== 2 || coordinates.some((coordinate) => (
      !['number', 'string'].includes(typeof coordinate) || String(coordinate).trim() === ''
    )) || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
      return res.status(400).json({ message: 'Location must be a valid [longitude, latitude] coordinate.' })
    }
    validatedLocation = { type: 'Point', coordinates: [longitude, latitude] }
  }
  const food = await Food.create({
    donor: req.user._id, name, category, quantity, quantityUnit, description, image,
    city: donorCity,
    address, preparedAt: preparation, pickupTime: pickup, expiryTime: expiry, safetyChecklist, location: validatedLocation,
  })
  const populated = await food.populate('donor', 'name verified address')
  req.app.get('io').emit('food:updated', { foodId: String(food._id), status: food.status })
  res.status(201).json({ message: 'Food listing published successfully.', food: populated })
}))

router.patch('/:id/status', authenticate, authorize('donor'), [
  body('status').equals('cancelled').withMessage('A donor can cancel an unclaimed listing.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  const food = await Food.findOneAndUpdate(
    { _id: req.params.id, donor: req.user._id, status: 'listed' },
    { $set: { status: 'cancelled' } },
    { new: true },
  )
  if (!food) return res.status(409).json({ message: 'Only your unclaimed food listings can be cancelled.' })
  req.app.get('io').emit('food:updated', { foodId: String(food._id), status: food.status })
  res.json({ message: 'Food listing cancelled.', food })
}))

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id).populate('donor', 'name verified address')
  if (!food) return res.status(404).json({ message: 'Food listing not found.' })
  if (food.status !== 'listed' && req.user.role !== 'admin' && String(food.donor._id) !== String(req.user._id)) {
    const donation = await Donation.findOne({ food: food._id, recipient: req.user._id })
    if (!donation) return res.status(403).json({ message: 'This listing is no longer available.' })
  }
  res.json({ food })
}))

router.post('/:id/accept', authenticate, authorize('ngo'), asyncHandler(async (req, res) => {
  if (!req.user.verified) return res.status(403).json({ message: 'Your NGO must be verified before accepting food.' })
  const food = await Food.findOneAndUpdate(
    { _id: req.params.id, status: 'listed', expiryTime: { $gt: new Date() } },
    { $set: { status: 'accepted' } },
    { new: true },
  ).populate('donor', 'name verified address')
  if (!food) return res.status(409).json({ message: 'This food listing is no longer available.' })
  const verificationCode = String(randomInt(100000, 1000000))
  let donation
  try {
    donation = await Donation.create({
      food: food._id,
      donor: food.donor._id,
      recipient: req.user._id,
      verificationCode,
      pickupTime: food.pickupTime,
      status: 'accepted',
    })
  } catch (error) {
    await Food.updateOne({ _id: food._id, status: 'accepted' }, { $set: { status: 'listed' } })
    throw error
  }
  const populated = await Donation.findById(donation._id).select('+verificationCode')
    .populate('food')
    .populate('donor', 'name email phone address')
    .populate('recipient', 'name email phone address')
  const io = req.app.get('io')
  await emitDonation(io, populated, `${req.user.name} accepted your ${food.name} donation.`)
  res.status(201).json({ message: 'Food accepted. Contact the donor to arrange pickup.', donation: populated })
}))

export default router
