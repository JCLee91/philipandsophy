'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl } from '@/constants/landing';
import { SERVICE_SCHEMA } from '@/constants/seo';
import { ANALYTICS_EVENTS } from '@/constants/landing';
import { getLandingConfig } from '@/lib/firebase/landing';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '@/types/landing';

export default function ServicePageClient() {
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
      {/* JSON-LD Structured Data - Service */}
      <Script id="json-ld-service" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(SERVICE_SCHEMA)}
      </Script>

      {/* SEO 최적화를 위한 숨김 텍스트 */}
      <div className="seo-content">
        <h1>필립앤소피 독서 프로그램</h1>
        <p>2주간 온라인 독서 프로그램. 선별된 20명의 멤버와 함께 책을 읽고 감상을 공유합니다.</p>

        <h2>프로그램 특징</h2>
        <p>매력적인 사람은 책을 읽습니다 - 2주간 각자 선택한 책을 읽고 감상을 공유합니다.</p>
        <p>성취와 대화를 즐길 수 있습니다 - 함께한 사람들과 자연스럽게 깊은 대화를 나눕니다.</p>
        <p>지속할 수 있는 관계로 연결됩니다 - 일회성이 아닌 지속 가능한 인간관계를 만듭니다.</p>
      </div>

      <div className="container">
        {/* 첫 번째 이미지 + 동영상 오버레이 */}
        <div className="image-with-video-overlay">
          <Image
            src={getImageUrl('/image/landing/PnS_Service_1.webp')}
            alt="필립앤소피 독서 프로그램 소개"
            width={1170}
            height={3963}
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
              poster={getImageUrl('/image/landing/PnS_Service_1.webp')}
              aria-label="필립앤소피 프로그램 목업 영상"
            />
          </div>
        </div>

        <Image
          src={getImageUrl('/image/landing/PnS_Service_2.webp')}
          alt="필립앤소피 프로그램 상세 안내"
          width={1170}
          height={5151}
          className="main-image"
        />

        <Image
          src={getImageUrl('/image/landing/PnS_Service_3.webp')}
          alt="필립앤소피 프로그램 추가 정보"
          width={1170}
          height={4797}
          className="main-image"
        />

        {config && (
          <CtaButton
            analyticsName={ANALYTICS_EVENTS.SERVICE}
            ariaLabel="프로그램 참여 신청하기"
            text={config.ctaText}
            floatingText={config.floatingText}
            href={getHref()}
          />
        )}
      </div>
    </LandingLayout>
  );
}
