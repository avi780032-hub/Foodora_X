import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import Food from '../models/Food.js'
import User from '../models/User.js'

const demoDonorEmail = 'foodorax-demo-donor@example.invalid'
const demoDonorName = 'FoodoraX Demo Donor'

const listings = [
  {
    key: 'cholapur-meal-boxes',
    name: 'Demo: Fresh meal boxes',
    category: 'Prepared meals',
    quantity: 30,
    quantityUnit: 'meals',
    description: 'Sample listing for demonstrating nearby food discovery. Not a real donation.',
    city: 'Cholapur',
    state: 'Uttar Pradesh',
    address: 'Demo pickup point, Cholapur',
    coordinates: [82.99, 25.52],
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
  },
  {
    key: 'varanasi-seasonal-produce',
    name: 'Demo: Seasonal produce',
    category: 'Produce',
    quantity: 18,
    quantityUnit: 'kg',
    description: 'Sample listing for demonstrating nearby food discovery. Not a real donation.',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    address: 'Demo pickup point, Varanasi',
    coordinates: [83.01, 25.32],
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85',
  },
  {
    key: 'varanasi-bakery-boxes',
    name: 'Demo: Bakery boxes',
    category: 'Bakery',
    quantity: 12,
    quantityUnit: 'boxes',
    description: 'Sample listing for demonstrating nearby food discovery. Not a real donation.',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    address: 'Demo pickup point, Varanasi',
    coordinates: [82.98, 25.30],
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85',
  },
]

async function seedDemoFood() {
  try {
    await connectDatabase()
    let donor = await User.findOne({ email: demoDonorEmail })
    if (donor && (donor.role !== 'donor' || donor.name !== demoDonorName)) {
      throw new Error(`Refusing to use the existing non-demo account ${demoDonorEmail}.`)
    }
    if (!donor) {
      donor = await User.create({
        name: demoDonorName,
        email: demoDonorEmail,
        password: randomBytes(32).toString('hex'),
        role: 'donor',
        city: 'Cholapur',
        address: 'Demo account; not a real pickup location.',
      })
    }

    const now = Date.now()
    const preparedAt = new Date(now - 60 * 60 * 1000)
    const pickupTime = new Date(now + 4 * 60 * 60 * 1000)
    const expiryTime = new Date(now + 8 * 60 * 60 * 1000)
    for (const listing of listings) {
      await Food.updateOne(
        { demoSeedKey: listing.key },
        {
          $set: {
            donor: donor._id,
            name: listing.name,
            category: listing.category,
            quantity: listing.quantity,
            quantityUnit: listing.quantityUnit,
            description: listing.description,
            city: listing.city,
            state: listing.state,
            address: listing.address,
            image: listing.image,
            location: { type: 'Point', coordinates: listing.coordinates },
            preparedAt,
            pickupTime,
            expiryTime,
            safetyChecklist: {
              edible: true,
              stored: true,
              uncontaminated: true,
              preparationTimeEntered: true,
              expiryTimeEntered: true,
            },
            status: 'listed',
            demoOnly: true,
          },
          $setOnInsert: { demoSeedKey: listing.key },
        },
        { upsert: true, runValidators: true },
      )
    }
    console.log(`Seeded ${listings.length} clearly labeled, non-claimable demo food listings near Cholapur and Varanasi.`)
  } finally {
    await mongoose.disconnect()
  }
}

seedDemoFood().catch((error) => {
  console.error(`Demo food setup failed: ${error.message}`)
  process.exitCode = 1
})
