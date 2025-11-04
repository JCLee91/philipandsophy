import type { Metadata } from 'next';
import MembershipPageClient from './MembershipPageClient';

export const metadata: Metadata = {
  title: '멤버십 | 필립앤소피 독서소셜클럽',
  description: 'MEMBERS ONLY! 승인제로 운영되는 프리미엄 독서소셜클럽 멤버십. 설문과 전화 인터뷰를 통해 선별된 멤버들과 깊이있는 만남을 경험하세요.',
  keywords: ['멤버십', '승인제', '독서소셜클럽', '프리미엄 모임', '서울 네트워킹', 'Invitation Only'],
  alternates: {
    canonical: 'https://www.philipandsophy.kr/membership',
  },
  openGraph: {
    title: '필립앤소피 멤버십',
    description: '승인제 독서소셜클럽 - 생각이 통하는 인연을 만나는 프리미엄 멤버십',
    url: 'https://www.philipandsophy.kr/membership',
    siteName: 'Philip & Sophy',
    images: [
      {
        url: '/image/landing/PnS_Membership_1.webp',
        width: 1170,
        height: 4131,
        alt: '필립앤소피 멤버십',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '필립앤소피 멤버십',
    description: '승인제 독서소셜클럽 - 생각이 통하는 인연을 만나는 프리미엄 멤버십',
    images: ['/image/landing/PnS_Membership_1.webp'],
  },
};

export default function MembershipPage() {
  return <MembershipPageClient />;
}
