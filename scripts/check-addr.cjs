const mongoose = require('mongoose')
const fs = require('fs')

const MONGODB_URI = 'mongodb+srv://sumitsingh091785:sumit1785@cluster0.elwcxcr.mongodb.net/codesware'

async function main() {
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db

  // Sample addresses
  const addressesCol = db.collection('addresses')
  const addrCount = await addressesCol.countDocuments()
  const sampleAddresses = await addressesCol.find({}).limit(3).toArray()

  const result = {
    addrCount,
    sampleAddresses
  }

  fs.writeFileSync('scripts/db-result2.json', JSON.stringify(result, null, 2))
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(err => {
  fs.writeFileSync('scripts/db-result2.json', JSON.stringify({ error: err.message }))
  process.exit(1)
})
