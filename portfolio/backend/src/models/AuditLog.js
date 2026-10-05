import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, maxlength: 80 },
  targetType: { type: String, required: true, maxlength: 40 },
  targetId: { type: String, required: true, maxlength: 80 },
  details: { type: String, maxlength: 300, default: '' },
}, { timestamps: true })

auditLogSchema.index({ createdAt: -1 })

export default mongoose.model('AuditLog', auditLogSchema)
