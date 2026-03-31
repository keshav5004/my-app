const mongoose = require('mongoose')
require('dotenv').config()

async function check() {
    await mongoose.connect(process.env.MONGODB_URI)
    const products = await mongoose.connection.db.collection('products').find({}).toArray()
    products.forEach(p => {
        console.log(`Title: ${p.title}`)
        console.log(`Image: ${p.img}`)
        console.log('---')
    })
    await mongoose.disconnect()
    process.exit(0)
}
check()
