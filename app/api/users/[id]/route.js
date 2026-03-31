import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Order from '@/models/Order'
import Address from '@/models/Address'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'
import mongoose from 'mongoose'

export async function GET(request, { params }) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) return unauthorizedResponse(auth.error)

    await connectDB()

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const user = await User.findById(id).lean()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Fetch user orders
    const orders = await Order.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean()

    // Fetch all user addresses
    const addresses = await Address.find({ userId: user._id }).lean()

    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0)

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        orderCount: orders.length,
        totalSpent,
        orders,
        addresses,
      },
    })
  } catch (error) {
    console.error('User detail API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) return unauthorizedResponse(auth.error)

    await connectDB()

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, phone, address, city, state, postalCode, country } = body

    // Update user basic info
    const userUpdate = {}
    if (name !== undefined) userUpdate.name = name.trim()
    if (email !== undefined) userUpdate.email = email.trim().toLowerCase()

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: id } })
      if (existingUser) {
        return NextResponse.json({ error: 'Email is already in use by another user' }, { status: 400 })
      }
    }

    const user = await User.findByIdAndUpdate(id, userUpdate, { new: true, runValidators: true }).lean()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Update or create default address
    const addressFields = { phone, address, city, state, postalCode, country }
    const hasAddressData = Object.values(addressFields).some(v => v !== undefined && v !== null && v !== '')

    if (hasAddressData) {
      let defaultAddress = await Address.findOne({ userId: id, isDefault: true })
      
      if (defaultAddress) {
        // Update existing default address
        if (phone !== undefined) defaultAddress.phone = phone
        if (address !== undefined) defaultAddress.address = address
        if (city !== undefined) defaultAddress.city = city
        if (state !== undefined) defaultAddress.state = state
        if (postalCode !== undefined) defaultAddress.postalCode = postalCode
        if (country !== undefined) defaultAddress.country = country
        defaultAddress.name = name || user.name
        defaultAddress.email = email || user.email
        await defaultAddress.save()
      } else {
        // Create new default address
        await Address.create({
          userId: id,
          name: name || user.name,
          email: email || user.email,
          phone: phone || '',
          address: address || '',
          city: city || '',
          state: state || '',
          postalCode: postalCode || '',
          country: country || 'India',
          isDefault: true,
          addressType: 'home',
        })
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' })
  } catch (error) {
    console.error('User update API Error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
