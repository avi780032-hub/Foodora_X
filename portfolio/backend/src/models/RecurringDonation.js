import mongoose from 'mongoose'

const recurringDonationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  quantityUnit: { type: String, default: 'meals' },
  address: { type: String, required: true, trim: true, maxlength: 240 },
  frequency: { type: String, enum: ['weekly', 'monthly'], required: true },
  nextReminderAt: { type: Date, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('RecurringDonation', recurringDonationSchema)
