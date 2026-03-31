import mongoose from 'mongoose'

const MONGODB_URI = 'mongodb+srv://sumitsingh091785:sumit1785@cluster0.elwcxcr.mongodb.net/codesware'

async function main() {
  await mongoose.connect(MONGODB_URI)

  const db = mongoose.connection.db

  // List all collections
  const collections = await db.listCollections().toArray()
  const collNames = collections.map(c => c.name)
  console.log('COLLECTIONS:', JSON.stringify(collNames))

  // Check users collection
  const usersCollection = db.collection('users')
  const count = await usersCollection.countDocuments()
  console.log('USER_COUNT:', count)

  // Get sample user documents
  const sampleUsers = await usersCollection.find({}).limit(2).toArray()
  for (let i = 0; i < sampleUsers.length; i++) {
    // Redact password for safety
    const user = { ...sampleUsers[i] }
    if (user.password) user.password = '[REDACTED]'
    console.log('USER_' + i + ':', JSON.stringify(user))
  }

  await mongoose.disconnect()
  process.exit(0)
}

main().catch(err => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
