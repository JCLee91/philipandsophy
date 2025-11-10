'use client';

import Image from 'next/image';
import Script from 'next/script';
import LandingLayout from '@/components/landing/LandingLayout';
import Tooltip from '@/components/Tooltip';

export default function MembershipPageClient() {
  return (
    <LandingLayout>
      {/* JSON-LD Structured Data - Membership */}
      <Script id="json-ld-membership" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MemberProgram",
          "name": "필립앤소피 멤버십",
          "provider": {
            "@type": "Organization",
            "name": "Philip & Sophy"
          },
          "description": "승인제 독서소셜클럽 멤버십 - 품격있는 만남과 깊이있는 대화",
          "membershipType": "승인제",
          "areaServed": "서울"
        })}
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
          src="/image/landing/PnS_Membership_1.webp?v=1762739366900"
          alt="필립앤소피 멤버십 소개"
          width={1170}
          height={4131}
          className="main-image"
          priority
        />

        <Image
          src="/image/landing/PnS_Membership_2.webp?v=1762739366900"
          alt="필립앤소피 멤버십 상세 안내"
          width={1170}
          height={3969}
          className="main-image"
        />

        <div className="cta-section">
          <Tooltip />
          <a
            href="https://smore.im/form/13J1nUevrX"
            target="_blank"
            rel="noopener"
            aria-label="멤버십 신청하기"
            className="cta-button"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).fbq) {
                (window as any).fbq('track', 'CompleteRegistration', {content_name: '멤버십_신청'});
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
