'use client';

import Image from 'next/image';
import LandingLayout from '@/components/landing/LandingLayout';
import { getImageUrl } from '@/constants/landing';

// ✅ Disable static generation - providers require runtime context
export const dynamic = 'force-dynamic';

export default function SecretPartyPage() {
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
                        src={getImageUrl('/image/landing/PnS_Members_Party_1.webp?v=2')}
                        alt="필립앤소피 크리스마스 파티 초대장 - 2023.12.18"
                        width={1170}
                        height={8022}
                        className="main-image"
                        priority
                    />

                    {/* 신청하기 버튼 오버레이 */}
                    <div className="absolute left-0 right-0 top-[23.5%] z-10 flex flex-col items-center justify-center gap-3 px-4 sm:px-5">
                        <a
                            href="https://smore.im/form/ghjIyG9Bv8"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex min-h-[72px] w-full max-w-[380px] items-center justify-center overflow-hidden rounded-[20px] border border-white/20 bg-gradient-to-br from-gray-800/90 to-black/95 px-6 sm:px-8 py-4 text-center text-[17px] sm:text-[19px] md:text-[20px] font-semibold leading-tight text-white shadow-[0_12px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-[3px] hover:scale-[1.02] hover:bg-gradient-to-br hover:from-gray-700/90 hover:to-black hover:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] active:scale-[0.98] active:-translate-y-[1px] active:duration-100 before:absolute before:left-[-100%] before:top-0 before:z-[1] before:h-full before:w-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-all before:duration-1000 before:ease-out hover:before:left-[100%]"
                            aria-label="12월 멤버스 파티 신청하기"
                        >
                            <span className="relative z-10 whitespace-nowrap [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">12월 멤버스 파티 신청하기</span>
                        </a>
                    </div>
                </div>

                <Image
                    src={getImageUrl('/image/landing/PnS_Members_Party_2.webp?v=2')}
                    alt="필립앤소피 연말 파티 상세 안내"
                    width={1170}
                    height={1161}
                    className="main-image"
                />
            </div>
        </LandingLayout>
    );
}
