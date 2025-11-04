'use client';

import Image from 'next/image';
import Script from 'next/script';
import LandingLayout from '@/components/landing/LandingLayout';
import Tooltip from '@/components/Tooltip';

export default function ServicePageClient() {
  return (
    <LandingLayout>
      {/* JSON-LD Structured Data - Service */}
      <Script id="json-ld-service" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "필립앤소피 독서 프로그램",
          "provider": {
            "@type": "Organization",
            "name": "Philip & Sophy"
          },
          "description": "2주간 온라인 독서 프로그램 - 선별된 멤버들과 함께 책을 읽고 소통하는 프리미엄 소셜클럽",
          "areaServed": "서울",
          "audience": {
            "@type": "Audience",
            "audienceType": "25-40세 직장인 및 전문직"
          }
        })}
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
            src="/image/landing/PnS_Program_1.webp?v=4.0"
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
              poster="/image/landing/PnS_Program_1.webp?v=4.0"
              aria-label="필립앤소피 프로그램 목업 영상"
            />
          </div>
        </div>

        <Image
          src="/image/landing/PnS_Program_2.webp?v=4.0"
          alt="필립앤소피 프로그램 상세 안내"
          width={1170}
          height={5871}
          className="main-image"
        />

        <Image
          src="/image/landing/PnS_Service_3.webp?v=4.0"
          alt="필립앤소피 프로그램 추가 정보"
          width={1170}
          height={4797}
          className="main-image"
        />

        <div className="cta-section">
          <Tooltip />
          <a
            href="https://smore.im/form/13J1nUevrX"
            target="_blank"
            rel="noopener"
            aria-label="프로그램 참여 신청하기"
            className="cta-button"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).fbq) {
                (window as any).fbq('track', 'CompleteRegistration', {content_name: '프로그램_신청'});
              }
            }}
          >
            <span className="cta-text">필립앤소피 3기 참여하기</span>
            <div className="cta-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </a>
        </div>
      </div>
    </LandingLayout>
  );
}
