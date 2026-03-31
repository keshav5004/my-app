import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db'
import Admin from '@/models/Admin'
import { generateToken } from '@/lib/jwt'

export async function POST(request) {
    try {
        const body = await request.json()
        const { email, password } = body

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        // Connect to database
        await connectDB()

        // Find admin user
        const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password')

        if (!admin) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password)

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Generate JWT token
        const token = generateToken({
            id: admin._id.toString(),
            email: admin.email,
            name: admin.name,
            role: admin.role
        })

        // Create response with token
        const response = NextResponse.json({
            success: true,
            token,
            user: {
                id: admin._id.toString(),
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        })

        // Set token in HTTP-only cookie (recommended for security)
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        })

        return response
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}