import { NextResponse } from 'next/server'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'
import connectDB from '@/lib/db'
import Product from '@/models/Product'

// Helper: convert file to base64 data URL
async function fileToDataUrl(file) {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
}

// GET - Fetch single product
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

// PATCH - Update product
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

        // Convert new image to base64 data URL
        if (imgFile && typeof imgFile !== 'string' && imgFile.size > 0) {
            updateData.img = await fileToDataUrl(imgFile)
        }

        // Handle variants
        if (variantsRaw) {
            try {
                const variants = JSON.parse(variantsRaw)
                updateData.variants = variants.map(v => ({
                    size: v.size,
                    color: v.color,
                    img: v.img || '',
                    price: parseFloat(v.price),
                    availability: v.availability !== false
                }))
            } catch {
                return NextResponse.json({ error: 'Invalid variants format' }, { status: 400 })
            }
        }

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ product })
    } catch (error) {
        console.error('Update Product Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE - Delete product
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

        return NextResponse.json({ message: 'Product deleted successfully' })
    } catch (error) {
        console.error('Delete Product Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
