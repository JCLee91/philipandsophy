'use client';

import Image from 'next/image';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl, ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';

export const dynamic = 'force-dynamic';

export default function PricingPage() {
    const { config, getHref } = useLandingConfig();

    return (
        <LandingLayout>
            <div className="container p-0 max-w-[500px] mx-auto">
                <Image
                    src={getImageUrl('/image/landing/PnS_Pricing_1.webp?v=1765966010154')}
                    alt="가격 안내 1"
                    width={1170}
                    height={2000}
                    className="main-image"
                    priority
                />
                <Image
                    src={getImageUrl('/image/landing/PnS_Pricing_2.webp?v=1765966010154')}
                    alt="가격 안내 2"
                    width={1170}
                    height={2000}
                    className="main-image"
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
