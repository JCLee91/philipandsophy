import { NextRequest, NextResponse } from 'next/server';
import { getResizedImageUrl, getOriginalImageUrl } from '@/lib/image-utils';
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
        // 1. Generate the resized URL
        const resizedUrl = getResizedImageUrl(url);

        // 2. Check if resized image exists (HEAD request)
        // We try to fetch the resized URL. If it's a 404 (or 403 meaning we can't validly access it as a resized file),
        // we assume it's not available and fallback to original.
        const resizeCheckResponse = await fetch(resizedUrl!, { method: 'HEAD' });

        // 3. Redirect logic
        if (resizeCheckResponse.ok) {
            // If resized exists, redirect to it
            // Cache the redirect itself for performance (browser remembers "this input URL = that output URL")
            return NextResponse.redirect(resizedUrl!, {
                status: 307, // Temporary redirect (in case we fix the image later)
                headers: {
                    // Cache the REDIRECT decision for 1 hour, not the image itself
                    'Cache-Control': 'public, max-age=3600',
                }
            });
        } else {
            // If resized missing, redirect to original
            // logger.warn('Resized not found, redirecting to original', { resizedUrl });
            return NextResponse.redirect(url, {
                status: 307,
                headers: {
                    'Cache-Control': 'public, max-age=3600',
                }
            });
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Image proxy error', { error: message, url });
        // Fallback: Just redirect to the original URL if anything crashes
        return NextResponse.redirect(url, { status: 307 });
    }
}
