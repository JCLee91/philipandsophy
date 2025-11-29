'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

const PIXEL_ID = '1151958033749307';

export default function FacebookPixel() {
    const [loaded, setLoaded] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!loaded) return;

        if (window.fbq) {
            window.fbq('track', 'PageView');
        }
    }, [pathname, searchParams, loaded]);

    return (
        <div>
            <Script
                id="fb-pixel"
                src="https://connect.facebook.net/en_US/fbevents.js"
                strategy="afterInteractive"
                onLoad={() => {
                    setLoaded(true);
                    if (window.fbq) {
                        window.fbq('init', PIXEL_ID);
                        window.fbq('track', 'PageView');
                    }
                }}
            />
        </div>
    );
}
