import type { Metadata } from 'next';
import PartyReviewsPageClient from './PartyReviewsPageClient';

export const metadata: Metadata = {
  title: '파티 후기 | 필립앤소피 독서소셜클럽',
  description: '필립앤소피 독서 프로그램 참여자들의 실제 후기. 나와 잘 맞는 사람들과 자연스럽게 만나고 깊이있는 대화를 나눈 경험담을 확인하세요.',
  keywords: ['독서모임 후기', '소셜클럽 후기', '필립앤소피 후기', '독서 프로그램 후기', '서울 소셜클럽', '네트워킹 후기'],
  alternates: {
    canonical: 'https://www.philipandsophy.kr/party-reviews',
  },
  openGraph: {
    title: '필립앤소피 파티 후기',
    description: '참여자들의 실제 경험담 - 책을 통해 만난 특별한 사람들',
    url: 'https://www.philipandsophy.kr/party-reviews',
    siteName: 'Philip & Sophy',
    images: [
      {
        url: '/image/landing/PnS_Review_1.png',
        width: 1170,
        height: 4000,
        alt: '필립앤소피 파티 후기',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '필립앤소피 파티 후기',
    description: '참여자들의 실제 경험담 - 책을 통해 만난 특별한 사람들',
    images: ['/image/landing/PnS_Review_1.png'],
  },
};

export default function PartyReviewsPage() {
  return <PartyReviewsPageClient />;
}
