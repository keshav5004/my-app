import { NextResponse } from 'next/server'
import { verifyToken } from './jwt'

// Middleware to verify JWT token from headers or cookies
export async function verifyAuth(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    let token = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7) // Remove 'Bearer ' prefix
    }

    // Fallback: Get token from cookie
    if (!token) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        token = cookies.token
      }
    }

    if (!token) {
      return { authenticated: false, error: 'No token provided' }
    }

    // Verify token
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return { authenticated: false, error: 'Invalid or expired token' }
    }

    return { 
      authenticated: true, 
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { authenticated: false, error: 'Authentication failed' }
  }
}

// Helper function to create unauthorized response
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}