'use client';

import Image from 'next/image';
import Script from 'next/script';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl } from '@/constants/landing';
import { PARTY_REVIEWS_SCHEMA } from '@/constants/seo';
import { ANALYTICS_EVENTS } from '@/constants/landing';

export default function PartyReviewsPageClient() {
  return (
    <LandingLayout>
      {/* JSON-LD Structured Data - Party Reviews */}
      <Script id="json-ld-party-reviews" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(PARTY_REVIEWS_SCHEMA)}
      </Script>

      {/* SEO 최적화를 위한 숨김 텍스트 */}
      <div className="seo-content">
        <h1>필립앤소피 파티 후기</h1>
        <p>필립앤소피 독서 프로그램 참여자들의 실제 후기와 경험담을 확인하세요.</p>

        <h2>참여자 후기</h2>
        <p>나와 잘 맞는 사람을 자연스럽게 만날 수 있었던 경험</p>
        <p>책을 읽으며 서로의 생각을 공유하고 깊이있는 대화를 나눴습니다</p>
        <p>단순한 독서모임이 아닌 지속 가능한 관계를 만들 수 있었습니다</p>
      </div>

      <div className="container">
        <Image
          src={getImageUrl('/image/landing/PnS_Review_1.png')}
          alt="필립앤소피 파티 후기 - 참여자들의 실제 경험담"
          width={1170}
          height={4000}
          className="main-image"
          priority
        />

        <CtaButton
          analyticsName={ANALYTICS_EVENTS.PARTY_REVIEWS}
          ariaLabel="파티 참여 신청하기"
        />
      </div>
    </LandingLayout>
  );
}
