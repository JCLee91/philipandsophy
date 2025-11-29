import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: false,
    themeColor: '#000000',
};

// 설문조사 페이지는 PWA 기능(설치 유도, 앱으로 열기 등)을 비활성화합니다.
export const metadata: Metadata = {
    manifest: null,
    appleWebApp: {
        capable: false,
    },
    other: {
        'apple-mobile-web-app-capable': 'no',
        'mobile-web-app-capable': 'no',
    },
};

export default function ApplicationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
