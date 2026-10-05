import mongoose from 'mongoose'

export async function connectDatabase() {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI is missing. Add it to portfolio/backend/.env.')
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  console.log(`MongoDB connected: ${mongoose.connection.host}`)
}
