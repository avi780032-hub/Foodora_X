import mongoose from 'mongoose'

const foodRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, enum: ['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'] },
  quantity: { type: Number, required: true, min: 1 },
  quantityUnit: { type: String, required: true, enum: ['meals', 'kg', 'boxes', 'portions'] },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  neededBy: { type: Date, default: null },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  address: { type: String, trim: true, maxlength: 240, default: '' },
  status: { type: String, enum: ['open', 'matched', 'fulfilled', 'cancelled'], default: 'open', index: true },
  fulfilledFood: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', default: null },
}, { timestamps: true })

foodRequestSchema.index({ status: 1, category: 1, neededBy: 1 })

export default mongoose.model('FoodRequest', foodRequestSchema)
