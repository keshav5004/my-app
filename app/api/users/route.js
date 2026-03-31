import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Order from '@/models/Order'
import Address from '@/models/Address'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'

export async function GET(request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) return unauthorizedResponse(auth.error)

    await connectDB()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Build search query
    let query = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    // Fetch users
    const users = await User.find(query).sort({ createdAt: -1 }).lean()

    const userIds = users.map((u) => u._id)

    // Aggregate order counts and total spent per user
    const orderAgg = await Order.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ])

    const orderMap = {}
    for (const item of orderAgg) {
      orderMap[item._id.toString()] = {
        orderCount: item.orderCount,
        totalSpent: item.totalSpent,
        lastOrderAt: item.lastOrderAt,
      }
    }

    // Fetch default addresses for all users
    const addresses = await Address.find({
      userId: { $in: userIds },
      isDefault: true,
    }).lean()

    const addressMap = {}
    for (const addr of addresses) {
      const key = addr.userId.toString()
      // keep only first default address per user
      if (!addressMap[key]) addressMap[key] = addr
    }

    // Merge everything together
    const enrichedUsers = users.map((u) => {
      const id = u._id.toString()
      const orderInfo = orderMap[id] || { orderCount: 0, totalSpent: 0, lastOrderAt: null }
      const addr = addressMap[id] || null

      return {
        _id: id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        orderCount: orderInfo.orderCount,
        totalSpent: orderInfo.totalSpent,
        lastOrderAt: orderInfo.lastOrderAt,
        phone: addr?.phone || null,
        city: addr?.city || null,
        state: addr?.state || null,
        country: addr?.country || null,
        address: addr?.address || null,
        postalCode: addr?.postalCode || null,
      }
    })

    // Summary stats
    const totalRevenue = enrichedUsers.reduce((sum, u) => sum + u.totalSpent, 0)
    const activeUsers = enrichedUsers.filter((u) => u.orderCount > 0).length

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      stats: {
        totalUsers: enrichedUsers.length,
        activeUsers,
        totalRevenue,
      },
    })
  } catch (error) {
    console.error('Users API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
