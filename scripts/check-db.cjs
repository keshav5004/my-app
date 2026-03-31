const mongoose = require('mongoose')
const fs = require('fs')

const MONGODB_URI = 'mongodb+srv://sumitsingh091785:sumit1785@cluster0.elwcxcr.mongodb.net/codesware'

async function main() {
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db

  const collections = await db.listCollections().toArray()
  const collNames = collections.map(c => c.name)

  const usersCollection = db.collection('users')
  const count = await usersCollection.countDocuments()
  const sampleUsers = await usersCollection.find({}).limit(2).toArray()

  const sanitized = sampleUsers.map(u => {
    const copy = { ...u }
    if (copy.password) copy.password = '[REDACTED]'
    return copy
  })

  const result = {
    collections: collNames,
    userCount: count,
    sampleUsers: sanitized
  }

  fs.writeFileSync('scripts/db-result.json', JSON.stringify(result, null, 2))
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(err => {
  fs.writeFileSync('scripts/db-result.json', JSON.stringify({ error: err.message }))
  process.exit(1)
})
