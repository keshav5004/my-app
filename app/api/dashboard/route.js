import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Order from '@/models/Order'
import Product from '@/models/Product'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'

export async function GET(request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) return unauthorizedResponse(auth.error)

    await connectDB()

    // Get counts
    const [totalProducts, totalUsers, totalOrders] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Order.countDocuments(),
    ])

    // Revenue + order status breakdown
    const orderAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          paidRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] },
          },
        },
      },
    ])

    const revenue = orderAgg[0] || { totalRevenue: 0, paidRevenue: 0 }

    // Order status distribution
    const statusAgg = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])

    const statusDistribution = {}
    for (const s of statusAgg) {
      statusDistribution[s._id] = s.count
    }

    // Recent orders (last 10)
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    const formattedOrders = recentOrders.map((o) => ({
      _id: o._id.toString(),
      orderId: o.orderId,
      customer: o.shippingAddress?.name || 'Unknown',
      product: o.products?.[0]?.name || 'N/A',
      productCount: o.products?.length || 0,
      status: o.status,
      amount: o.total,
      paymentMethod: o.paymentMethod,
      date: new Date(o.createdAt).toISOString().split('T')[0],
    }))

    // Today's stats
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset)
    const todayIST = new Date(istNow)
    todayIST.setUTCHours(0, 0, 0, 0)
    const todayStartUTC = new Date(todayIST.getTime() - istOffset)

    const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStartUTC } })
    const todayRevenueAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: todayStartUTC } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ])
    const todayRevenue = todayRevenueAgg[0]?.total || 0

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: revenue.totalRevenue,
        paidRevenue: revenue.paidRevenue,
        todayOrders,
        todayRevenue,
      },
      statusDistribution,
      recentOrders: formattedOrders,
    })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
