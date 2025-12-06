import { NextRequest, NextResponse } from 'next/server';
import { getRawResizedUrl, getOriginalImageUrl } from '@/lib/image-utils';
import { logger } from '@/lib/logger';

export const runtime = 'edge'; // Use Edge Runtime for lower latency

/**
 * GET /api/proxy-image?url=...
 * 
 * Proxies image requests to bypass CORS or to serve resized versions.
 * - Tries to fetch the resized version first (_1200x1200).
 * - If that fails (404), falls back to the original URL.
 * - Caches the result aggressively.
 */
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        // 1. Generate the resized URL (using RAW logic, not the proxy wrapper)
        const resizedUrl = getRawResizedUrl(url);

        // 2. Fetch the image
        // Try to fetch the resized version first
        let targetUrl = resizedUrl || url;
        let response = await fetch(targetUrl);

        // 3. Fallback logic: If resized version returns 404, try original
        if (response.status === 404 && targetUrl !== url) {
            // logger.warn('Resized image not found, falling back to original', { resizedUrl, originalUrl: url });
            targetUrl = url;
            response = await fetch(targetUrl);
        }

        if (!response.ok) {
            logger.error('Failed to fetch image', {
                status: response.status,
                url: targetUrl
            });
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        // 4. Prepare response headers
        // We override the Cache-Control to force the browser to cache this for 1 year
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const cacheControl = 'public, max-age=31536000, immutable'; // Cache for 1 year

        // 5. Stream the response
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
                // 'Access-Control-Allow-Origin': '*', // Optional
            },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Image proxy error', { error: message, url });
        // Fallback: Just redirect to the original URL if streaming fails completely
        return NextResponse.redirect(url, { status: 307 });
    }
}
