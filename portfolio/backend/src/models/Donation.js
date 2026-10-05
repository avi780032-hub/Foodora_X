import mongoose from 'mongoose'

const donationSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true, index: true },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  verificationCode: { type: String, required: true, select: false },
  status: { type: String, enum: ['accepted', 'pickup_started', 'delivered', 'cancelled'], default: 'accepted', index: true },
  pickupTime: { type: Date, required: true },
  deliveredAt: { type: Date, default: null },
}, { timestamps: true })

export default mongoose.model('Donation', donationSchema)
