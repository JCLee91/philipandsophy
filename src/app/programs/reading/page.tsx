'use client';

import Image from 'next/image';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl, ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';

export const dynamic = 'force-dynamic';

export default function ReadingProgramPage() {
    const { config, getHref } = useLandingConfig();

    return (
        <LandingLayout>
            <div className="container p-0 max-w-[500px] mx-auto">
                {/* 첫 번째 이미지 + 동영상 오버레이 */}
                <div className="image-with-video-overlay">
                    <Image
                        src={getImageUrl('/image/landing/PnS_Program_reading_1.webp')}
                        alt="2주 독서 프로그램 소개 1"
                        width={1170}
                        height={2000} // Approximate, will auto-adjust height with layout but good to have high val
                        className="main-image"
                        priority
                    />

                    {/* 중간 비어있는 공간에 동영상 배치 */}
                    <div className="video-overlay">
                        <video
                            className="overlay-video"
                            src="/video/mockup.mp4"
                            autoPlay
                            muted
                            loop
                            playsInline
                            poster={getImageUrl('/image/landing/PnS_Program_reading_1.webp')}
                        />
                    </div>
                </div>
                <Image
                    src={getImageUrl('/image/landing/PnS_Program_reading_2.webp')}
                    alt="2주 독서 프로그램 소개 2"
                    width={1170}
                    height={2000}
                    className="main-image"
                />

                {config && (
                    <CtaButton
                        analyticsName={ANALYTICS_EVENTS.HOME} // Using generic HOME or create new if strictly needed, keeping safe
                        ariaLabel="사전 신청 설문 열기"
                        text={config.ctaText}
                        floatingText={config.floatingText}
                        href={getHref()}
                    />
                )}
            </div>
        </LandingLayout>
    );
}
