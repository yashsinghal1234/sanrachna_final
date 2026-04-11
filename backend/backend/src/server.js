const path = require('path')

// Always load .env from backend/ (same folder as package.json), not cwd
const envPath = path.join(__dirname, '..', '.env')
require('dotenv').config({ path: envPath })

const app = require('./app')
const { connectDB } = require('./config/db')

const PORT = process.env.PORT || 5000

async function bootstrap() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error.message)
  if (!process.env.MONGODB_URI) {
    console.error(
      `\nTip: Create backend/.env with MONGODB_URI (copy backend/.env.example → backend/.env).\nExpected file: ${envPath}\n`,
    )
  }
  process.exit(1)
})
