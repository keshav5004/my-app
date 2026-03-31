const mongoose = require('mongoose')
require('dotenv').config()

async function fixImagePaths() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected')

    const products = await mongoose.connection.db.collection('products').find({}).toArray()

    for (const p of products) {
        if (p.img && p.img.startsWith('/uploads/')) {
            const newImg = p.img.replace('/uploads/', '/api/uploads/')
            await mongoose.connection.db.collection('products').updateOne(
                { _id: p._id },
                { $set: { img: newImg } }
            )
            console.log('Fixed:', p.title, '->', newImg)
        }
    }

    console.log('Done!')
    await mongoose.disconnect()
    process.exit(0)
}

fixImagePaths()
