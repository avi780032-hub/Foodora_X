export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function validationError(errors) {
  return errors.array({ onlyFirstError: true }).map(({ path, msg }) => ({ field: path, message: msg }))
}

export function emitDonation(io, donation, message) {
  const detail = {
    donationId: String(donation._id),
    foodId: String(donation.food?._id || donation.food),
    status: donation.status,
  }
  for (const userId of [donation.donor?._id || donation.donor, donation.recipient?._id || donation.recipient]) {
    if (userId) io.to(`user:${userId}`).emit('notification', { ...detail, message })
  }
  io.emit('food:updated', detail)
}
