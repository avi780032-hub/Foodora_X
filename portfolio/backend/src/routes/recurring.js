import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import RecurringDonation from '../models/RecurringDonation.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, validationError } from '../utils/http.js'

const router = Router()
const categories = ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other']

router.get('/', authenticate, authorize('donor'), asyncHandler(async (req, res) => {
  const schedules = await RecurringDonation.find({ donor: req.user._id }).sort({ createdAt: -1 })
  res.json({ schedules })
}))

router.post('/', authenticate, authorize('donor'), [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Enter a food name.'),
  body('category').isIn(categories).withMessage('Choose a valid food category.'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be greater than zero.'),
  body('address').trim().isLength({ min: 3, max: 240 }).withMessage('Enter a pickup address.'),
  body('frequency').isIn(['weekly', 'monthly']).withMessage('Choose a weekly or monthly schedule.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check the recurring donation details.', errors: validationError(errors) })
  const nextReminderAt = new Date()
  nextReminderAt.setDate(nextReminderAt.getDate() + (req.body.frequency === 'weekly' ? 7 : 30))
  const schedule = await RecurringDonation.create({ ...req.body, donor: req.user._id, nextReminderAt })
  res.status(201).json({ message: 'Recurring donation reminder saved.', schedule })
}))

router.patch('/:id', authenticate, authorize('donor'), [
  body('active').isBoolean().withMessage('Schedule status must be active or inactive.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  const schedule = await RecurringDonation.findOneAndUpdate(
    { _id: req.params.id, donor: req.user._id },
    { $set: { active: req.body.active } },
    { new: true },
  )
  if (!schedule) return res.status(404).json({ message: 'Recurring donation schedule not found.' })
  res.json({ schedule })
}))

export default router
