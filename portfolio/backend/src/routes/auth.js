import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler, validationError } from '../utils/http.js'

const router = Router()
const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  active: user.active,
  address: user.address,
  location: user.location,
  verified: user.verified,
  preferredCategories: user.preferredCategories,
  quantityNeeded: user.quantityNeeded,
  createdAt: user.createdAt,
})
const makeToken = (user) => jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Enter a name between 2 and 100 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters.'),
  body('role').isIn(['donor', 'ngo']).withMessage('Choose donor or NGO as your role.'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Phone number is too long.'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 240 }).withMessage('Address is too long.'),
  body('quantityNeeded').optional({ values: 'falsy' }).isInt({ min: 0, max: 100000 }).withMessage('Preferred quantity must be a whole number from 0 to 100000.'),
  body('preferredCategories').optional().isArray({ max: 6 }).withMessage('Choose up to 6 preferred categories.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check the highlighted details.', errors: validationError(errors) })
  const { name, email, password, phone = '', address = '', role, location, preferredCategories = [], quantityNeeded = 0 } = req.body
  const validCategories = ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other']
  if (role === 'ngo' && preferredCategories.some((category) => !validCategories.includes(category))) {
    return res.status(400).json({ message: 'Choose valid preferred food categories.' })
  }
  const coordinates = location?.coordinates
  if (coordinates !== undefined && (!Array.isArray(coordinates) || (coordinates.length !== 0 && (
    coordinates.length !== 2
    || coordinates.some((coordinate) => (
      !['number', 'string'].includes(typeof coordinate)
      || String(coordinate).trim() === ''
      || !Number.isFinite(Number(coordinate))
    ))
    || Math.abs(Number(coordinates[0])) > 180
    || Math.abs(Number(coordinates[1])) > 90
  )))) {
    return res.status(400).json({ message: 'Location must include valid longitude and latitude coordinates.' })
  }
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' })
  const user = await User.create({
    name, email, password, phone, address, role,
    location: location?.coordinates?.length ? { type: 'Point', coordinates: location.coordinates.map(Number) } : undefined,
    verified: role === 'donor',
    preferredCategories: role === 'ngo' ? preferredCategories : [],
    quantityNeeded: role === 'ngo' ? Number(quantityNeeded) : 0,
  })
  res.status(201).json({
    message: role === 'ngo' ? 'Account created. An administrator must verify your organization before it can accept donations.' : 'Your account is ready.',
    token: makeToken(user),
    user: safeUser(user),
  })
}))

router.post('/login', [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Enter your password.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Enter a valid email and password.', errors: validationError(errors) })
  const user = await User.findOne({ email: req.body.email }).select('+password')
  if (!user || !(await user.comparePassword(req.body.password))) {
    return res.status(401).json({ message: 'The email or password is incorrect.' })
  }
  res.json({ token: makeToken(user), user: safeUser(user) })
}))

router.get('/me', authenticate, (req, res) => res.json({ user: safeUser(req.user) }))

router.patch('/me', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone number is too long.'),
  body('address').optional().trim().isLength({ max: 240 }).withMessage('Address is too long.'),
  body('quantityNeeded').optional().isInt({ min: 0, max: 100000 }).withMessage('Preferred quantity must be from 0 to 100000.'),
  body('preferredCategories').optional().isArray({ max: 6 }).withMessage('Choose up to 6 food categories.'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check your profile details.', errors: validationError(errors) })
  const validCategories = ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other']
  if (req.body.preferredCategories?.some((category) => !validCategories.includes(category))) {
    return res.status(400).json({ message: 'Choose valid preferred food categories.' })
  }
  let location = req.user.location
  if (req.body.location !== undefined) {
    const coordinates = req.body.location?.coordinates
    if (!Array.isArray(coordinates) || (coordinates.length !== 0 && (
      coordinates.length !== 2
      || coordinates.some((coordinate) => (
        !['number', 'string'].includes(typeof coordinate)
        || String(coordinate).trim() === ''
        || !Number.isFinite(Number(coordinate))
      ))
      || Math.abs(Number(coordinates[0])) > 180
      || Math.abs(Number(coordinates[1])) > 90
    ))) return res.status(400).json({ message: 'Location must include valid longitude and latitude coordinates.' })
    location = coordinates.length ? { type: 'Point', coordinates: coordinates.map(Number) } : undefined
  }
  const updates = {}
  for (const key of ['name', 'phone', 'address']) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (location !== req.user.location || req.body.location !== undefined) updates.location = location
  if (req.user.role === 'ngo') {
    if (req.body.quantityNeeded !== undefined) updates.quantityNeeded = Number(req.body.quantityNeeded)
    if (req.body.preferredCategories !== undefined) updates.preferredCategories = req.body.preferredCategories
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true })
  res.json({ message: 'Profile updated successfully.', user: safeUser(user) })
}))

export default router
