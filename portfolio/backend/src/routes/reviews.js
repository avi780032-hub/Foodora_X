import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import Donation from '../models/Donation.js'
import Review from '../models/Review.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler, validationError } from '../utils/http.js'

const router = Router()

router.get('/donation/:id', authenticate, asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id)
  if (!donation) return res.status(404).json({ message: 'Donation not found.' })
  if (![String(donation.donor), String(donation.recipient)].includes(String(req.user._id)) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only donation participants can see its reviews.' })
  }
  const reviews = await Review.find({ donation: donation._id }).populate('reviewer', 'name role').sort({ createdAt: 1 })
  res.json({ reviews })
}))

router.post('/donation/:id', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be from 1 to 5 stars.'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check your review.', errors: validationError(errors) })
  const donation = await Donation.findOne({
    _id: req.params.id,
    status: 'delivered',
    $or: [{ donor: req.user._id }, { recipient: req.user._id }],
  })
  if (!donation) return res.status(404).json({ message: 'Only participants in a completed donation can leave a review.' })
  if (await Review.exists({ donation: donation._id, reviewer: req.user._id })) {
    return res.status(409).json({ message: 'You have already reviewed this donation.' })
  }
  const recipient = String(donation.donor) === String(req.user._id) ? donation.recipient : donation.donor
  const review = await Review.create({
    donation: donation._id,
    reviewer: req.user._id,
    recipient,
    rating: Number(req.body.rating),
    comment: req.body.comment || '',
  })
  res.status(201).json({ message: 'Thank you for sharing your feedback.', review })
}))

export default router
