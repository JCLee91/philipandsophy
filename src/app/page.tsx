'use client';

import Image from 'next/image';
import Script from 'next/script';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import HeroImageSlider from '@/components/landing/HeroImageSlider';
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
        <h1>필립앤소피 | 승인제 소셜클럽</h1>
        <p>검증된 사람들과 함께 즐기는 문화 생활. 생각이 통하는 인연을 만나 함께 도심 속 낭만을 즐겨요.</p>

        <h2>멤버들과 즐기는 도심 속 다양한 문화 생활</h2>
        <p>멤버 전용 앱에서 프로필 북으로 서로를 미리 알아보고 원하는 문화 생활을 함께 즐겨보세요.</p>

        <h2>함께 하면 더 즐거운 문화 생활</h2>
        <p>큐레이션된 다양한 문화 생활을 살펴보고 내가 원하는 이벤트에 참가해보세요.</p>

        <h2>만나기 전 미리 알아보는 멤버들</h2>
        <p>함께하는 멤버들의 프로필 북을 읽으면 상대방의 생각과 가치관을 미리 알 수 있어요.</p>

        <h2>다시 만나며 이어지는 인연</h2>
        <p>함께하고 싶은 멤버가 있다면 이벤트에 동반 참가를 제안할 수 있어요.</p>

        <h2>자주 묻는 질문</h2>
        <h3>Q. 어떤 사람들이 참여하나요?</h3>
        <p>대기업, 전문직, 공기업, 스타트업, 크리에이터 등 다양한 분야에서 활동 중인 2030 멤버들이 함께합니다.</p>

        <h3>Q. 인증을 많이 못하면 불이익이 있나요?</h3>
        <p>총 13일 중 4일 이상 생각을 남겨주셔야만 정식 멤버로 승인됩니다.</p>
      </div>

      <div className="container p-0 max-w-[500px] mx-auto" style={{ paddingTop: '40px' }}>
        <HeroImageSlider />

        <Image
          src={getImageUrl('/image/landing/PnS_2.webp?v=1766590000001')}
          alt="필립앤소피 소개"
          width={1170}
          height={8721} // Updated height based on new image
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
