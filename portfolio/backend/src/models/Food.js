import mongoose from 'mongoose'

const foodSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  category: { type: String, required: true, trim: true, enum: ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'] },
  quantity: { type: Number, required: true, min: 1 },
  quantityUnit: { type: String, trim: true, enum: ['meals', 'kg', 'boxes', 'portions'], default: 'meals' },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  image: { type: String, trim: true, maxlength: 1000, default: '' },
  address: { type: String, required: true, trim: true, maxlength: 240 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
    label: { type: String, trim: true, default: '' },
  },
  preparedAt: { type: Date, required: true },
  pickupTime: { type: Date, required: true },
  expiryTime: { type: Date, required: true },
  safetyChecklist: {
    edible: { type: Boolean, required: true },
    stored: { type: Boolean, required: true },
    uncontaminated: { type: Boolean, required: true },
    preparationTimeEntered: { type: Boolean, required: true },
    expiryTimeEntered: { type: Boolean, required: true },
  },
  status: { type: String, enum: ['listed', 'matched', 'accepted', 'pickup_started', 'delivered', 'cancelled'], default: 'listed', index: true },
  expiryReminderSentAt: { type: Date, default: null },
}, { timestamps: true })

foodSchema.index({ location: '2dsphere' })
foodSchema.index({ status: 1, category: 1, expiryTime: 1 })

export default mongoose.model('Food', foodSchema)
