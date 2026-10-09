import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: (coordinates) => coordinates.length === 2
        && coordinates.every(Number.isFinite)
        && Math.abs(coordinates[0]) <= 180
        && Math.abs(coordinates[1]) <= 90,
      message: 'Location coordinates must be valid [longitude, latitude].',
    },
  },
  label: { type: String, trim: true, default: '' },
}, { _id: false })

const foodSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  foodRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRequest', default: null, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  state: { type: String, trim: true, maxlength: 80, default: '' },
  category: { type: String, required: true, trim: true, enum: ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'] },
  quantity: { type: Number, required: true, min: 1 },
  quantityUnit: { type: String, trim: true, enum: ['meals', 'kg', 'boxes', 'portions'], default: 'meals' },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  image: { type: String, trim: true, maxlength: 1000, default: '' },
  address: { type: String, required: true, trim: true, maxlength: 240 },
  location: { type: locationSchema, default: undefined },
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
  demoOnly: { type: Boolean, default: false, index: true },
  demoSeedKey: { type: String, trim: true, default: null, select: false },
  expiryReminderSentAt: { type: Date, default: null },
}, { timestamps: true })

foodSchema.index({ location: '2dsphere' })
foodSchema.index({ status: 1, category: 1, expiryTime: 1 })
foodSchema.index({ demoSeedKey: 1 }, { unique: true, partialFilterExpression: { demoSeedKey: { $type: 'string' } } })

export default mongoose.model('Food', foodSchema)