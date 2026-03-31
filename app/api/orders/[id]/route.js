import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Order from '@/models/Order'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'

// GET single order by ID
export async function GET(request, { params }) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error)
    }

    await connectDB()

    const { id } = await params
    const order = await Order.findById(id).lean()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH update order status
export async function PATCH(request, { params }) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error)
    }

    await connectDB()

    const { id } = await params
    const body = await request.json()
    const { status, trackingNumber, notes } = body

    const updateData = {}
    if (status) updateData.status = status
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (notes !== undefined) updateData.notes = notes

    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
