import { NextResponse } from 'next/server'
import { verifyAuth, unauthorizedResponse } from '@/lib/auth-middleware'
import connectDB from '@/lib/db'
import Admin from '@/models/Admin'

export async function GET(request) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error)
    }

    await connectDB()

    // Get fresh user data from database
    const admin = await Admin.findById(auth.user.id).select('-password')

    if (!admin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: admin.role,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}