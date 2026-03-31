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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    // Build query filters
    let query = {}

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
      ]
    }

    if (status) {
      query.status = status
    }

    // Fetch all orders sorted by newest first
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean()

    // Group by date boundaries
    const { todayStartUTC, yesterdayStartUTC } = getISTDayBoundaries()

    const todayOrders = []
    const yesterdayOrders = []
    const olderOrders = []

    for (const order of orders) {
      const createdAt = new Date(order.createdAt)
      if (createdAt >= todayStartUTC) {
        todayOrders.push(order)
      } else if (createdAt >= yesterdayStartUTC) {
        yesterdayOrders.push(order)
      } else {
        olderOrders.push(order)
      }
    }

    // Summary stats
    const stats = {
      todayCount: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      yesterdayCount: yesterdayOrders.length,
      yesterdayRevenue: yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      totalOrders: orders.length,
      pendingCount: orders.filter(o => o.status === 'pending').length,
      shippedCount: orders.filter(o => o.status === 'shipped').length,
      deliveredCount: orders.filter(o => o.status === 'delivered').length,
    }

    return NextResponse.json({
      success: true,
      stats,
      todayOrders,
      yesterdayOrders,
      olderOrders,
    })
  } catch (error) {
    console.error('Orders API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
