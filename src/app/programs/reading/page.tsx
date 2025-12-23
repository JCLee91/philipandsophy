'use client';

import Image from 'next/image';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl, ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';

// ✅ Disable static generation - providers require runtime context
export const dynamic = 'force-dynamic';

import Script from 'next/script';
import { SERVICE_SCHEMA } from '@/constants/seo';

export default function ReadingProgramPage() {
    const { config, getHref } = useLandingConfig();

    return (
        <LandingLayout>
            {/* JSON-LD Structured Data */}
            <Script id="json-ld-service" type="application/ld+json" strategy="afterInteractive">
                {JSON.stringify(SERVICE_SCHEMA)}
            </Script>

            {/* SEO Content (Hidden) */}
            <div className="seo-content">
                <h1>2주 독서 프로그램 - 하루 10분 독서로 완성하는 나만의 프로필 북</h1>
                <p>멤버 전용 앱에서 2주 동안 서로의 생각들을 알아가고 함께 만나 웰컴 파티를 즐겨요!</p>

                <h2>프로그램 진행 과정</h2>
                <ol>
                    <li>성비를 맞춘 총 약 30명의 멤버가 함께해요.</li>
                    <li>2주간 각자 원하는 책을 읽으며 생각을 남겨요.</li>
                    <li>AI가 매일 비슷한 생각을 가진 멤버들을 연결해요.</li>
                    <li>2주 동안 프로필 북을 완성하면 웰컴 파티에서 만나 친해져요!</li>
                </ol>

                <h2>프로그램 특징</h2>
                <h3>나를 소개하는 프로필 카드</h3>
                <p>인터뷰 내용을 토대로 직업, 일상, 취미 등 나만의 프로필 카드가 완성돼요.</p>

                <h3>나의 생각을 기록하는 시간</h3>
                <p>만약 책을 읽지 못했다면 하루를 회고하며 오늘 느꼈던 감정이나 생각을 작성해 주세요.</p>

                <h3>AI가 분석한 같은 결의 멤버들</h3>
                <p>AI가 제출한 답변을 분석해서 나와 비슷한 생각과 가치관을 가진 멤버들을 연결해줘요.</p>

                <h3>반가운 얼굴들과 즐기는 웰컴 파티</h3>
                <p>2주간 생각을 나눴던 같은 기수의 멤버들과 분위기 좋은 공간에서 웰컴 파티를 즐겨요!</p>

                <p>더이상 소모적인 만남에 시간을 낭비하지 마세요. 당신의 매력은 결이 맞는 사람들 속에서 가장 빛납니다. 필립앤소피에서 생각이 통하는 인연을 만나보세요.</p>
            </div>

            <div className="container p-0 max-w-[500px] mx-auto">
                {/* 첫 번째 이미지 + 동영상 오버레이 */}
                <div className="image-with-video-overlay">
                    <Image
                        src={getImageUrl('/image/landing/PnS_Program_reading_1.webp?v=1766590000001')}
                        alt="2주 독서 프로그램 소개 1 - 하루 10분 독서로 완성하는 나만의 프로필 북"
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
                            poster={getImageUrl('/image/landing/PnS_Program_reading_1.webp?v=1766590000001')}
                        />
                    </div>
                </div>
                <Image
                    src={getImageUrl('/image/landing/PnS_Program_reading_2.webp?v=1766590000001')}
                    alt="2주 독서 프로그램 소개 2 - AI 매칭 및 웰컴 파티"
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
