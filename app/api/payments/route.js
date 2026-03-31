import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Order from '@/models/Order'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'

// Helper: Get start of day in IST (UTC+5:30)
function getISTDayBoundaries() {
  const now = new Date()

  // Get current time in IST
  const istOffset = 5.5 * 60 * 60 * 1000 // 5h 30m in ms
  const istNow = new Date(now.getTime() + istOffset)

  // Start of today in IST (midnight IST converted to UTC)
  const todayIST = new Date(istNow)
  todayIST.setUTCHours(0, 0, 0, 0)
  const todayStartUTC = new Date(todayIST.getTime() - istOffset)

  // Start of yesterday in IST
  const yesterdayStartUTC = new Date(todayStartUTC.getTime() - 24 * 60 * 60 * 1000)

  return { todayStartUTC, yesterdayStartUTC }
}

export async function GET(request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error)
    }

    await connectDB()

    // Fetch all orders to extract payment info, sorting newest first
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean()

    const allPayments = orders.map((order) => {
      // Use the 'paymentId' if it's there, otherwise 'N/A'
      // If paymentMethod is COD and status is paid, we might still not have a paymentId, which is fine
      return {
        id: order._id.toString(), // Use the Order's Mongo ID securely as payment ID reference
        orderId: order.orderId,
        customer: order.shippingAddress?.name || 'Unknown Customer',
        amount: order.total,
        method: order.paymentMethod === 'cod' ? 'COD' : 'Online',
        status: order.paymentStatus || 'pending',
        date: new Date(order.createdAt).toISOString().split('T')[0], // YYYY-MM-DD
        createdAt: order.createdAt,
        transactionId: order.paymentId || 'N/A'
      }
    })

    const { todayStartUTC, yesterdayStartUTC } = getISTDayBoundaries()

    const todayPayments = []
    const yesterdayPayments = []
    const olderPayments = []

    for (const p of allPayments) {
      const createdAt = new Date(p.createdAt)
      if (createdAt >= todayStartUTC) {
        todayPayments.push(p)
      } else if (createdAt >= yesterdayStartUTC) {
        yesterdayPayments.push(p)
      } else {
        olderPayments.push(p)
      }
    }

    return NextResponse.json({
      success: true,
      payments: allPayments,
      todayPayments,
      yesterdayPayments,
      olderPayments
    })
  } catch (error) {
    console.error('Payments API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
