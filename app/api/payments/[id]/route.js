import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Order from '@/models/Order'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'

export async function PATCH(request, context) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error)
    }

    const { id } = await context.params

    await connectDB()

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Payment status is required' },
        { status: 400 }
      )
    }

    // Since we mapped the MongoDB Order ID to 'id' in our GET route,
    // we use it to find the Order document and update 'paymentStatus'
    const order = await Order.findByIdAndUpdate(
      id,
      { paymentStatus: status },
      { new: true }
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Payment record (Order) not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      paymentStatus: order.paymentStatus
    })
  } catch (error) {
    console.error('Update Payment Error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    )
  }
}
