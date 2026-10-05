import AuditLog from '../models/AuditLog.js'

export function writeAudit(actor, action, targetType, targetId, details = '') {
  return AuditLog.create({ actor, action, targetType, targetId: String(targetId), details })
}
