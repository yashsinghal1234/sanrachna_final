require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is missing. Create backend/.env first.')

  await mongoose.connect(uri)
  const db = mongoose.connection.db

  // Keep users collection, wipe everything else created by the app.
  const collectionsToClear = [
    'projects',
    'dailylogs',
    'rfis',
    'issues',
    'contacts',
    'documentmetas',
    'notifications',
    'emergencyincidents',
    'copilotthreads',
  ]

  const existing = await db.listCollections().toArray()
  const existingNames = new Set(existing.map((c) => c.name))

  for (const name of collectionsToClear) {
    if (!existingNames.has(name)) continue
    // eslint-disable-next-line no-await-in-loop
    const result = await db.collection(name).deleteMany({})
    console.log(`Cleared ${name}: deleted ${result.deletedCount}`)
  }

  console.log('Done. Users collection was not touched.')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})

