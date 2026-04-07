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

// Slug generator
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

// GET — fetch all products from shared MongoDB
export async function GET(request) {
    try {
        const auth = await verifyAuth(request)
        if (!auth.authenticated) return unauthorizedResponse(auth.error)

        await connectDB()

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')

        let query = {}
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ]
            }
        }

        const products = await Product.find(query).sort({ _id: -1 })
        return NextResponse.json({ products })
    } catch (error) {
        console.error('Get Products Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST — create new product, upload images to Cloudinary, save URL to MongoDB
export async function POST(request) {
    try {
        const auth = await verifyAuth(request)
        if (!auth.authenticated) return unauthorizedResponse(auth.error)

        await connectDB()

        const formData = await request.formData()

        const title = formData.get('title')
        const description = formData.get('description')
        const category = formData.get('category')
        const imgFile = formData.get('img')
        const variantsRaw = formData.get('variants')

        if (!title || !description || !category || !imgFile || !variantsRaw) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        let variants
        try {
            variants = JSON.parse(variantsRaw)
        } catch {
            return NextResponse.json({ error: 'Invalid variants format' }, { status: 400 })
        }

        if (!variants.length) {
            return NextResponse.json({ error: 'At least one variant is required' }, { status: 400 })
        }

        // Upload main product image to Cloudinary
        console.log('[Products] Uploading main image to Cloudinary...')
        let imgUrl = ''
        if (imgFile && typeof imgFile !== 'string' && imgFile.size > 0) {
            imgUrl = await uploadToCloudinary(imgFile, 'fitloom/products')
            console.log('[Products] Main image URL:', imgUrl)
        } else {
            return NextResponse.json({ error: 'Product image file is required' }, { status: 400 })
        }

        // Upload variant images to Cloudinary
        for (let i = 0; i < variants.length; i++) {
            const variantImageFiles = formData.getAll(`variantImages_${i}`)
            console.log(`[Products] Variant ${i}: ${variantImageFiles.length} image(s)`)

            // Keep existing string URLs (already uploaded) from the variants JSON
            let imageUrls = Array.isArray(variants[i].images)
                ? variants[i].images.filter(img => typeof img === 'string' && img.startsWith('http'))
                : []

            for (const file of variantImageFiles) {
                if (file && typeof file !== 'string' && file.size > 0) {
                    const url = await uploadToCloudinary(file, 'fitloom/variants')
                    imageUrls.push(url)
                    console.log(`[Products] Variant ${i} image URL:`, url)
                }
            }

            variants[i].images = imageUrls.slice(0, 4)
            variants[i].img = imageUrls[0] || ''
        }

        // Generate unique slug
        let slug = generateSlug(title)
        const existing = await Product.findOne({ slug })
        if (existing) slug = `${slug}-${Date.now()}`

        console.log('[Products] Saving to MongoDB...')
        const product = await Product.create({
            title,
            slug,
            description,
            img: imgUrl,
            category,
            variants: variants.map(v => ({
                size: v.size,
                color: v.color,
                img: v.img || (v.images && v.images[0]) || '',
                images: v.images || [],
                price: parseFloat(v.price),
                availability: v.availability !== false
            }))
        })

        console.log('[Products] Product created:', product._id)
        return NextResponse.json({ product }, { status: 201 })
    } catch (error) {
        console.error('Create Product Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}