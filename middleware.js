import { NextResponse } from 'next/server'

export function middleware(request) {
    const { pathname } = request.nextUrl

    // Public routes - allow login page and login API
    if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth')) {
        return NextResponse.next()
    }

    // Protect admin routes - check if token cookie exists
    // Full JWT verification happens in API routes (Node.js runtime)
    if (pathname.startsWith('/admin')) {
        const token = request.cookies.get('token')?.value

        if (!token) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*']
}