import mongoose from 'mongoose'

const routePointSchema = new mongoose.Schema({
  coordinates: {
    type: [Number],
    validate: {
      validator(value) {
        return value.length === 0 || (value.length === 2 && value.every(Number.isFinite))
      },
      message: 'Route coordinates must be [longitude, latitude].',
    },
    default: [],
  },
  status: { type: String, enum: ['assigned', 'en_route', 'drop_off', 'delivered'], default: 'en_route' },
  capturedAt: { type: Date, default: Date.now },
}, { _id: false })

const donationSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true, index: true },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  verificationCode: { type: String, required: true, select: false },
  status: { type: String, enum: ['accepted', 'pickup_started', 'delivered', 'cancelled'], default: 'accepted', index: true },
  pickupStatus: { type: String, enum: ['pending', 'assigned', 'en_route', 'delivered'], default: 'pending', index: true },
  pickupTime: { type: Date, required: true },
  deliveredAt: { type: Date, default: null },
  liveLocation: { type: [Number], default: [] },
  routePoints: [routePointSchema],
  routeSummary: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Donation', donationSchema)
