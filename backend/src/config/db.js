const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables.')
  }

  // Prevent ECONNRESET and connection drops on Windows / Cloud MongoDB
  const options = {
    family: 4, // Use IPv4, skip IPv6 resolution which often causes ECONNRESET
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000,
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Reconnection will be handled automatically by Mongoose.')
  })

  await mongoose.connect(uri, options)
  console.log('MongoDB connected successfully')
}

module.exports = { connectDB }
