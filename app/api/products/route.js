import { NextResponse } from 'next/server'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'
import connectDB from '@/lib/db'
import Product from '@/models/Product'

// Helper: generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

// Helper: convert file to base64 data URL
async function fileToDataUrl(file) {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
}

// GET - Fetch all products
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

// POST - Create new product
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

        // Validation
        if (!title || !description || !category || !imgFile || !variantsRaw) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Parse variants
        let variants
        try {
            variants = JSON.parse(variantsRaw)
        } catch {
            return NextResponse.json({ error: 'Invalid variants format' }, { status: 400 })
        }

        if (!variants.length) {
            return NextResponse.json({ error: 'At least one variant is required' }, { status: 400 })
        }

        // Convert image file to base64 data URL
        let imgUrl = ''
        if (imgFile && typeof imgFile !== 'string' && imgFile.size > 0) {
            imgUrl = await fileToDataUrl(imgFile)
        } else if (typeof imgFile === 'string') {
            imgUrl = imgFile
        }

        // Generate unique slug
        let slug = generateSlug(title)
        const existing = await Product.findOne({ slug })
        if (existing) {
            slug = `${slug}-${Date.now()}`
        }

        const product = await Product.create({
            title,
            slug,
            description,
            img: imgUrl,
            category,
            variants: variants.map(v => ({
                size: v.size,
                color: v.color,
                img: v.img || '',
                price: parseFloat(v.price),
                availability: v.availability !== false
            }))
        })

        return NextResponse.json({ product }, { status: 201 })
    } catch (error) {
        console.error('Create Product Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}