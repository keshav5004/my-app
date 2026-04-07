import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'
import connectDB from '@/lib/db'
import Product from '@/models/Product'

// Configure Cloudinary with hardcoded credentials (also in .env as backup)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dq7neqplg',
    api_key: process.env.CLOUDINARY_API_KEY || '113235843698782',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'Njp2UbsM57-bE70qUggBjTgr8Kc',
})

// Upload a File/Blob to Cloudinary, returns the secure HTTPS URL
async function uploadToCloudinary(file, folder = 'fitloom/products') {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error)
                resolve(result.secure_url)
            }
        )
        stream.end(buffer)
    })
}

// GET — fetch single product
export async function GET(request, { params }) {
    try {
        const auth = await verifyAuth(request)
        if (!auth.authenticated) return unauthorizedResponse(auth.error)

        await connectDB()

        const { id } = await params
        const product = await Product.findById(id)

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ product })
    } catch (error) {
        console.error('Get Product Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH — update product, upload any new images to Cloudinary
export async function PATCH(request, { params }) {
    try {
        const auth = await verifyAuth(request)
        if (!auth.authenticated) return unauthorizedResponse(auth.error)

        await connectDB()

        const { id } = await params
        const formData = await request.formData()

        const updateData = {}

        const title = formData.get('title')
        const description = formData.get('description')
        const category = formData.get('category')
        const imgFile = formData.get('img')
        const variantsRaw = formData.get('variants')

        if (title) updateData.title = title
        if (description) updateData.description = description
        if (category) updateData.category = category

        // Upload new main image if provided
        if (imgFile && typeof imgFile !== 'string' && imgFile.size > 0) {
            console.log('[Products] Uploading updated main image to Cloudinary...')
            updateData.img = await uploadToCloudinary(imgFile, 'fitloom/products')
            console.log('[Products] Updated main image URL:', updateData.img)
        }

        // Handle variants
        if (variantsRaw) {
            let variants
            try {
                variants = JSON.parse(variantsRaw)
            } catch {
                return NextResponse.json({ error: 'Invalid variants format' }, { status: 400 })
            }

            for (let i = 0; i < variants.length; i++) {
                const variantImageFiles = formData.getAll(`variantImages_${i}`)

                // Keep existing URLs that are already on Cloudinary
                let imageUrls = Array.isArray(variants[i].images)
                    ? variants[i].images.filter(img => typeof img === 'string' && img.startsWith('http'))
                    : []

                for (const file of variantImageFiles) {
                    if (file && typeof file !== 'string' && file.size > 0) {
                        const url = await uploadToCloudinary(file, 'fitloom/variants')
                        imageUrls.push(url)
                        console.log(`[Products] Variant ${i} updated image URL:`, url)
                    }
                }

                variants[i].images = imageUrls.slice(0, 4)
                variants[i].img = imageUrls[0] || ''
            }

            updateData.variants = variants.map(v => ({
                size: v.size,
                color: v.color,
                img: v.img || (v.images && v.images[0]) || '',
                images: v.images || [],
                price: parseFloat(v.price),
                availability: v.availability !== false
            }))
        }

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        console.log('[Products] Product updated:', id)
        return NextResponse.json({ product })
    } catch (error) {
        console.error('Update Product Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE — delete product from MongoDB
export async function DELETE(request, { params }) {
    try {
        const auth = await verifyAuth(request)
        if (!auth.authenticated) return unauthorizedResponse(auth.error)

        await connectDB()

        const { id } = await params
        const product = await Product.findByIdAndDelete(id)

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        console.log('[Products] Product deleted:', id)
        return NextResponse.json({ message: 'Product deleted successfully' })
    } catch (error) {
        console.error('Delete Product Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
