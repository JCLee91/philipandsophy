'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LandingLayout from '@/components/landing/LandingLayout';
import { getImageUrl } from '@/constants/landing';
import { getLandingConfig } from '@/lib/firebase/landing';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '@/types/landing';

// ✅ Disable static generation - providers require runtime context
export const dynamic = 'force-dynamic';

export default function SecretPartyPage() {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [showFloatingButton, setShowFloatingButton] = useState(false);
    const [config, setConfig] = useState<LandingConfig | null>(null);

    useEffect(() => {
        getLandingConfig()
            .then(setConfig)
            .catch(() => setConfig(DEFAULT_LANDING_CONFIG));
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // 버튼이 시야에서 벗어나면 floating 버튼 표시
                setShowFloatingButton(!entry.isIntersecting);
            },
            {
                threshold: 0.1, // 버튼의 10%만 보여도 "보이는 중"으로 간주
            }
        );

        if (buttonRef.current) {
            observer.observe(buttonRef.current);
        }

        return () => {
            if (buttonRef.current) {
                observer.unobserve(buttonRef.current);
            }
        };
    }, []);

    return (
        <LandingLayout>
            {/* SEO 최적화를 위한 숨김 텍스트 - 시크릿 페이지이므로 최소화 */}
            <div className="seo-content">
                <h1>필립앤소피 | 연말 파티</h1>
                <p>필립앤소피 멤버들을 위한 특별한 연말 파티에 초대합니다.</p>
            </div>

            {/* 시크릿 페이지는 검색엔진 수집 제외 */}
            <meta name="robots" content="noindex, nofollow" />

            <div className="party-page-container">
                <div className="party-image-wrapper">
                    <Image
                        src={config?.images?.['party_1'] || getImageUrl('/image/landing/PnS_Members_Party_1.webp?v=2')}
                        alt="필립앤소피 크리스마스 파티 초대장 - 2023.12.18"
                        width={1170}
                        height={8022}
                        className="main-image"
                        priority
                    />

                    {/* 신청하기 버튼 오버레이 - 마감 페이지로 연결 */}
                    <div ref={buttonRef} className="absolute left-0 right-0 top-[23.5%] z-10 flex flex-col items-center justify-center gap-3 px-4 sm:px-5">
                        <Link
                            href="/party-closed"
                            className="cta-button gray w-full max-w-[380px] min-h-[72px] rounded-[20px]"
                            aria-label="12월 멤버스 파티 신청하기"
                        >
                            <span className="cta-text text-[18px] sm:text-[20px] md:text-[21px]">12월 멤버스 파티 신청하기</span>
                        </Link>
                    </div>
                </div>

                <Image
                    src={config?.images?.['party_2'] || getImageUrl('/image/landing/PnS_Members_Party_2.webp?v=2')}
                    alt="필립앤소피 연말 파티 상세 안내"
                    width={1170}
                    height={1161}
                    className="main-image"
                />
            </div>

            {/* Floating Sticky Button - 원래 버튼이 시야에서 벗어났을 때만 표시 */}
            <div
                className={`cta-section transition-all duration-500 ease-bounce ${showFloatingButton ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
                    }`}
            >
                <Link
                    href="/party-closed"
                    className="cta-button gray"
                    aria-label="12월 멤버스 파티 신청하기"
                >
                    <span className="cta-text">12월 멤버스 파티 신청하기</span>
                </Link>
            </div>
        </LandingLayout>
    );
}
