import { Router } from 'express'
import User from '../models/User.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler } from '../utils/http.js'

const router = Router()
router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const users = await User.find().select('name email phone role address verified active createdAt').sort({ createdAt: -1 }).limit(500)
  res.json({ users })
}))

export default router
