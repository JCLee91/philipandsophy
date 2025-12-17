'use client';

import Image from 'next/image';
import Script from 'next/script';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import HeroSection from '@/components/landing/HeroSection';
import { getImageUrl } from '@/constants/landing';
import { ORGANIZATION_SCHEMA } from '@/constants/seo';
import { ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';

// ✅ Disable static generation - providers require runtime context
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { config, getHref } = useLandingConfig();

  return (
    <LandingLayout>
      {/* JSON-LD Structured Data - Organization */}
      <Script id="json-ld-org" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(ORGANIZATION_SCHEMA)}
      </Script>

      {/* SEO 최적화를 위한 숨김 텍스트 */}
      <div className="seo-content">
        <h1>필립앤소피 | 승인제 독서소셜클럽</h1>
        <p>깊이 있는 대화가 설레는 만남으로. 품격, 진정성, 그리고 설렘을 추구하는 25-40세 직장인과 전문직을 위한 승인제 독서소셜클럽입니다.</p>

        <h2>3가지 NO 철학으로 차별화된 소셜클럽</h2>
        <p>NO 스몰토크 - 필립앤소피만의 방식으로 깊이 있는 대화를 나눕니다.</p>
        <p>NO 억지 텐션 - 편안한 분위기 속에서 자연스럽게 관계를 발전시킵니다.</p>
        <p>NO 일회성 만남 - 나와 같이 맞는 오래갈 인연을 발견할 수 있습니다.</p>
      </div>

      <div className="container p-0 max-w-[500px] mx-auto">
        <HeroSection />

        <Image
          src={config?.images?.['home_main_2'] || getImageUrl('/image/landing/PnS_2.webp')}
          alt="필립앤소피 소셜클럽 소개"
          width={1170}
          height={5526}
          className="main-image"
          priority
        />

        <Image
          src={config?.images?.['home_main_3'] || getImageUrl('/image/landing/PnS_3.webp')}
          alt="필립앤소피 서비스 특징"
          width={1170}
          height={6930}
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
