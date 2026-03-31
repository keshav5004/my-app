import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(request, { params }) {
    try {
        const { path: filePath } = await params
        const joinedPath = Array.isArray(filePath) ? filePath.join('/') : filePath

        // Security: prevent directory traversal
        if (joinedPath.includes('..')) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
        }

        const fullPath = path.join(process.cwd(), 'public', 'uploads', joinedPath)
        const fileBuffer = await readFile(fullPath)

        // Determine content type from extension
        const ext = path.extname(fullPath).toLowerCase()
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
        }

        const contentType = contentTypes[ext] || 'application/octet-stream'

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
            }
        })
    } catch (error) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
}
