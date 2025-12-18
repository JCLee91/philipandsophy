'use client';

import Image from 'next/image';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl, ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';

// ✅ Disable static generation - providers require runtime context
export const dynamic = 'force-dynamic';

import Script from 'next/script';
import { MEMBERSHIP_SCHEMA } from '@/constants/seo';

export default function MembershipProgramPage() {
    const { config, getHref } = useLandingConfig();

    return (
        <LandingLayout>
            {/* JSON-LD Structured Data */}
            <Script id="json-ld-membership" type="application/ld+json" strategy="afterInteractive">
                {JSON.stringify(MEMBERSHIP_SCHEMA)}
            </Script>

            {/* SEO Content (Hidden) */}
            <div className="seo-content">
                <h1>멤버십 프로그램 - 검증된 멤버들과 즐기는 도심 속 다양한 문화 생활</h1>
                <p>멤버 전용 앱에서 프로필 북으로 서로를 미리 알아보고 원하는 문화 생활을 함께 즐겨보세요!</p>

                <h2>함께 하면 더 즐거운 문화 생활</h2>
                <p>큐레이션된 다양한 문화 생활을 살펴보고 내가 원하는 이벤트에 참가해보세요.</p>

                <h2>만나기 전 미리 알아보는 멤버들</h2>
                <p>함께하는 멤버들의 프로필 북을 읽으면 상대방의 생각과 가치관을 미리 알 수 있어요.</p>

                <h2>다시 만나며 이어지는 인연</h2>
                <p>함께하고 싶은 멤버가 있다면 이벤트에 동반 참가하기를 제안할 수 있어요.</p>

                <p>더이상 소모적인 만남에 시간을 낭비하지 마세요. 당신의 매력은 결이 맞는 사람들 속에서 가장 빛납니다. 필립앤소피에서 생각이 통하는 인연을 만나보세요.</p>
            </div>

            <div className="container p-0 max-w-[500px] mx-auto">
                <Image
                    src={getImageUrl('/image/landing/PnS_Program_membership.webp?v=1734526000000')}
                    alt="멤버십 프로그램 소개 - 검증된 멤버들과 즐기는 도심 속 문화 생활"
                    width={1170}
                    height={2000}
                    className="main-image"
                    priority
                />

                {config && (
                    <CtaButton
                        analyticsName={ANALYTICS_EVENTS.HOME}
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
