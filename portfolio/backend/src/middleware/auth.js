import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : ''
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.sub)
    if (!user) return res.status(401).json({ message: 'This account no longer exists.' })
    if (!user.active) return res.status(403).json({ message: 'This account has been deactivated. Contact an administrator.' })
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session has expired. Please log in again.' })
    }
    next(error)
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' })
    }
    next()
  }
}
