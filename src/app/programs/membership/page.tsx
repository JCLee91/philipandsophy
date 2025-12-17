'use client';

import Image from 'next/image';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl, ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';

export const dynamic = 'force-dynamic';

export default function MembershipProgramPage() {
    const { config, getHref } = useLandingConfig();

    return (
        <LandingLayout>
            <div className="container p-0 max-w-[500px] mx-auto">
                <Image
                    src={getImageUrl('/image/landing/PnS_Program_membership.webp')}
                    alt="멤버십 프로그램 소개"
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
