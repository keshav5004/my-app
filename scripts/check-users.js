import mongoose from 'mongoose'

const MONGODB_URI = 'mongodb+srv://sumitsingh091785:sumit1785@cluster0.elwcxcr.mongodb.net/codesware'

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')
  
  const db = mongoose.connection.db
  
  // List all collections
  const collections = await db.listCollections().toArray()
  console.log('\n=== Collections ===')
  collections.forEach(c => console.log(' -', c.name))
  
  // Check users collection
  const usersCollection = db.collection('users')
  const count = await usersCollection.countDocuments()
  console.log(`\n=== Users Collection: ${count} documents ===`)
  
  // Get sample user document to see schema
  const sampleUsers = await usersCollection.find({}).limit(3).toArray()
  console.log('\n=== Sample User Documents ===')
  sampleUsers.forEach((user, i) => {
    console.log(`\n--- User ${i + 1} ---`)
    console.log(JSON.stringify(user, null, 2))
  })
  
  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
