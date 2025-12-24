'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

// GTM을 적용할 페이지 (기존 GA 적용 페이지와 동일)
const ALLOWED_PATHS = [
    '/',           // 메인 랜딩
    '/application', // 신청 폼
    '/pricing',    // 가격
    '/programs',   // 프로그램 소개
    '/reviews',    // 후기
];

const GTM_ID = 'GTM-W54HPPPK';

export default function GoogleTagManager() {
    const pathname = usePathname();
    const [shouldTrack, setShouldTrack] = useState(false);

    useEffect(() => {
        if (!pathname) return;
        // 정확히 일치하거나 하위 경로인 경우 트래킹
        const isAllowed = ALLOWED_PATHS.some(
            (path) => pathname === path || pathname.startsWith(`${path}/`)
        );
        setShouldTrack(isAllowed);
    }, [pathname]);

    if (!shouldTrack) return null;

    return (
        <>
            {/* Google Tag Manager - Script */}
            <Script
                id="gtm-script"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
                }}
            />
            {/* Google Tag Manager - NoScript */}
            <noscript>
                <iframe
                    src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                    height="0"
                    width="0"
                    style={{ display: 'none', visibility: 'hidden' }}
                />
            </noscript>
        </>
    );
}
