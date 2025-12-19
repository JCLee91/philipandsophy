/**
 * SEO JSON-LD 구조화 데이터 스키마
 */

/**
 * 필립앤소피 조직 정보 (공통)
 */
export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Philip & Sophy",
  "alternateName": "필립앤소피",
  "description": "검증된 사람들과 함께 문화생활을 즐기는 승인제 소셜클럽",
  "url": "https://www.philipandsophy.kr/",
  "logo": "https://www.philipandsophy.kr/image/app-icon.webp",
  "sameAs": [
    "https://www.instagram.com/philip_and_sophy",
    "https://smore.im/form/0C2SFfq79d"
  ],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "서울",
    "addressRegion": "서울특별시",
    "addressCountry": "KR"
  },
  "foundingDate": "2025"
} as const;

/**
 * 멤버십 프로그램 스키마
 */
export const MEMBERSHIP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "MemberProgram",
  "name": "필립앤소피 멤버십",
  "provider": {
    "@type": "Organization",
    "name": "Philip & Sophy"
  },
  "description": "검증된 사람들과 다양한 문화생활을 즐기는 승인제 멤버십",
  "membershipType": "승인제",
  "areaServed": "서울"
} as const;

/**
 * 서비스(프로그램) 스키마
 */
export const SERVICE_SCHEMA = {
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
} as const;

/**
 * 파티 후기 스키마
 */
export const PARTY_REVIEWS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": {
    "@type": "Event",
    "name": "필립앤소피 웰컴 파티",
    "organizer": {
      "@type": "Organization",
      "name": "Philip & Sophy"
    }
  },
  "description": "필립앤소피 소셜클럽 참여자들의 실제 후기와 경험담"
} as const;
