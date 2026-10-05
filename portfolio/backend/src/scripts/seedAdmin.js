import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import User from '../models/User.js'

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in portfolio/backend/.env before seeding.')
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  try {
    await connectDatabase()
    const email = ADMIN_EMAIL.toLowerCase().trim()
    const existing = await User.findOne({ email })
    if (existing) {
      if (existing.role !== 'admin') throw new Error('That email is already registered to a non-admin account.')
      existing.password = ADMIN_PASSWORD
      existing.verified = true
      await existing.save()
      console.log(`Updated administrator password for ${email}`)
    } else {
      await User.create({ name: 'FoodoraX Admin', email, password: ADMIN_PASSWORD, role: 'admin', verified: true })
      console.log(`Created FoodoraX administrator: ${email}`)
    }
  } finally {
    await mongoose.disconnect()
  }
}

seedAdmin().catch((error) => {
  console.error(`Admin setup failed: ${error.message}`)
  process.exitCode = 1
})
