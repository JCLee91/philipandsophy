'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl } from '@/constants/landing';
import { MEMBERSHIP_SCHEMA } from '@/constants/seo';
import { ANALYTICS_EVENTS } from '@/constants/landing';
import { getLandingConfig } from '@/lib/firebase/landing';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '@/types/landing';

export default function MembershipPageClient() {
  const [config, setConfig] = useState<LandingConfig | null>(null);

  useEffect(() => {
    getLandingConfig()
      .then(setConfig)
      .catch(() => setConfig(DEFAULT_LANDING_CONFIG));
  }, []);

  const getHref = () => {
    if (!config) return '/application';

    if (config.status === 'OPEN') {
      return config.openFormType === 'EXTERNAL' ? config.externalUrl : '/application';
    } else {
      if (config.closedFormType === 'EXTERNAL_WAITLIST') return config.externalUrl;
      if (config.closedFormType === 'INTERNAL_WAITLIST') return '/waitlist';
      return '#';
    }
  };

  return (
    <LandingLayout>
      {/* JSON-LD Structured Data - Membership */}
      <Script id="json-ld-membership" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(MEMBERSHIP_SCHEMA)}
      </Script>

      {/* SEO 최적화를 위한 숨김 텍스트 */}
      <div className="seo-content">
        <h1>필립앤소피 멤버십</h1>
        <p>MEMBERS ONLY! 승인제로 운영되는 프리미엄 독서소셜클럽 멤버십입니다.</p>

        <h2>멤버십 혜택</h2>
        <p>Invitation Only - 생각이 통하는 인연을 만나는 곳 필립앤소피로 당신을 초대합니다.</p>
        <p>선별된 멤버들과의 교류 - 설문과 전화 인터뷰를 통해 선별된 멤버들과 함께합니다.</p>
        <p>프리미엄 경험 - 서울의 프리미엄 공간에서 진행되는 클로징 파티를 즐기세요.</p>
      </div>

      <div className="container">
        <Image
          src={getImageUrl('/image/landing/PnS_Membership_1.webp?v=20251121')}
          alt="필립앤소피 멤버십 소개"
          width={1170}
          height={4131}
          className="main-image"
          priority
        />

        <Image
          src={getImageUrl('/image/landing/PnS_Membership_2.webp?v=20251121')}
          alt="필립앤소피 멤버십 상세 안내"
          width={1170}
          height={4204}
          className="main-image"
        />

        {config && (
          <CtaButton
            analyticsName={ANALYTICS_EVENTS.MEMBERSHIP}
            ariaLabel="멤버십 신청하기"
            text={config.ctaText}
            floatingText={config.floatingText}
            href={getHref()}
          />
        )}
      </div>
    </LandingLayout>
  );
}
