import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import Food from '../models/Food.js'
import FoodRequest from '../models/FoodRequest.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, validationError } from '../utils/http.js'

const router = Router()
const categories = ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other']
const quantityUnits = ['meals', 'kg', 'boxes', 'portions']
const populateRequest = (query) => query
  .populate('requester', 'name city address verified')
  .populate({ path: 'fulfilledFood', populate: { path: 'donor', select: 'name' } })

router.get('/', authenticate, authorize('donor', 'ngo'), asyncHandler(async (req, res) => {
  const currentOpenRequests = {
    status: 'open',
    $or: [{ neededBy: null }, { neededBy: { $gt: new Date() } }],
  }
  const offeredRequestIds = req.user.role === 'ngo'
    ? await Food.distinct('foodRequest', { donor: req.user._id, foodRequest: { $ne: null } })
    : []
  const filter = req.user.role === 'donor'
    ? currentOpenRequests
    : { $or: [
      { requester: req.user._id },
      { requester: { $ne: req.user._id }, ...currentOpenRequests },
      { fulfilledFood: { $in: offeredRequestIds } },
    ] }
  const requests = await populateRequest(FoodRequest.find(filter).sort({ neededBy: 1, createdAt: -1 }).limit(100))
  res.json({ requests })
}))

router.get('/:id', authenticate, authorize('donor', 'ngo'), [
  param('id').isMongoId().withMessage('Invalid food request ID.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  const currentOpenRequests = {
    status: 'open',
    $or: [{ neededBy: null }, { neededBy: { $gt: new Date() } }],
  }
  const filter = req.user.role === 'donor'
    ? { _id: req.params.id, ...currentOpenRequests }
    : { _id: req.params.id, $or: [{ requester: req.user._id }, { requester: { $ne: req.user._id }, ...currentOpenRequests }] }
  const request = await populateRequest(FoodRequest.findOne(filter))
  if (!request) return res.status(404).json({ message: 'This food request is no longer available.' })
  res.json({ request })
}))

router.post('/', authenticate, authorize('ngo'), [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Food name must be 2–120 characters.'),
  body('category').isIn(categories).withMessage('Choose a valid food category.'),
  body('quantity').isInt({ min: 1, max: 100000 }).withMessage('Quantity must be a whole number from 1 to 100000.'),
  body('quantityUnit').isIn(quantityUnits).withMessage('Choose a valid quantity unit.'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Request details cannot exceed 500 characters.'),
  body('neededBy').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid needed-by time.'),
  body('address').optional().trim().isLength({ max: 240 }).withMessage('Pickup address cannot exceed 240 characters.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check the food request details.', errors: validationError(errors) })
  const neededBy = req.body.neededBy ? new Date(req.body.neededBy) : null
  if (neededBy && neededBy <= new Date()) return res.status(400).json({ message: 'Needed-by time must be in the future.' })
  const request = await FoodRequest.create({
    requester: req.user._id,
    name: req.body.name,
    category: req.body.category,
    quantity: Number(req.body.quantity),
    quantityUnit: req.body.quantityUnit,
    description: req.body.description || '',
    neededBy,
    city: req.user.city || '',
    address: req.body.address || req.user.address || '',
  })
  const populated = await populateRequest(FoodRequest.findById(request._id))
  req.app.get('io').emit('food-request:updated', { requestId: String(request._id), status: request.status })
  res.status(201).json({ message: 'Food request posted. Donors can now offer it for free.', request: populated })
}))

router.patch('/:id/cancel', authenticate, authorize('ngo'), [
  param('id').isMongoId().withMessage('Invalid food request ID.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  const request = await FoodRequest.findOneAndUpdate(
    { _id: req.params.id, requester: req.user._id, status: 'open' },
    { $set: { status: 'cancelled' } },
    { new: true },
  )
  if (!request) return res.status(409).json({ message: 'Only your open food requests can be cancelled.' })
  req.app.get('io').emit('food-request:updated', { requestId: String(request._id), status: request.status })
  res.json({ message: 'Food request cancelled.', request })
}))

export default router
