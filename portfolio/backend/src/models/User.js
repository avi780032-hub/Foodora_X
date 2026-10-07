import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const locationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: {
    type: [Number],
    validate: {
      validator(value) {
        return value.length === 0 || (value.length === 2 && value.every(Number.isFinite))
      },
      message: 'Location coordinates must be [longitude, latitude].',
    },
  },
}, { _id: false })

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  whatsappNumber: { type: String, trim: true, maxlength: 30, default: '' },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  role: { type: String, enum: ['donor', 'ngo', 'volunteer', 'admin'], required: true },
  active: { type: Boolean, default: true },
  volunteer: { type: Boolean, default: false },
  address: { type: String, trim: true, maxlength: 240, default: '' },
  location: { type: locationSchema, default: undefined },
  verified: { type: Boolean, default: false },
  preferredCategories: [{ type: String, trim: true }],
  quantityNeeded: { type: Number, min: 0, default: 0 },
  priority: { type: Number, min: 1, max: 5, default: 1 },
}, { timestamps: true })

userSchema.index({ location: '2dsphere' })
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

export default mongoose.model('User', userSchema)
