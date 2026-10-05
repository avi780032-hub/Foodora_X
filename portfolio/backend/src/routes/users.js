import { Router } from 'express'
import User from '../models/User.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler } from '../utils/http.js'
import Review from '../models/Review.js'

const router = Router()
router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const users = await User.find().select('name email phone role address verified active createdAt').sort({ createdAt: -1 }).limit(500)
  res.json({ users })
}))

router.get('/:id/profile', authenticate, asyncHandler(async (req, res) => {
  const member = await User.findById(req.params.id).select('name role address verified createdAt')
  if (!member) return res.status(404).json({ message: 'Profile not found.' })
  const [summary, reviews] = await Promise.all([
    Review.aggregate([
      { $match: { recipient: member._id } },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
    ]),
    Review.find({ recipient: member._id }).populate('reviewer', 'name role').sort({ createdAt: -1 }).limit(20),
  ])
  res.json({ profile: member, rating: summary[0] || { averageRating: 0, reviewCount: 0 }, reviews })
}))

export default router
