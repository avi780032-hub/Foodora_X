import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

reviewSchema.index({ donation: 1, reviewer: 1 }, { unique: true })

export default mongoose.model('Review', reviewSchema)
