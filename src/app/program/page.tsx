import type { Metadata } from 'next';
import ServicePageClient from './ServicePageClient';

export const metadata: Metadata = {
  title: '프로그램 | 필립앤소피 독서소셜클럽',
  description: '2주간 온라인 독서 프로그램. 선별된 20명의 멤버와 함께 책을 읽고 깊이있는 대화를 나눕니다. 서울 25-40세 직장인 전문직 승인제 소셜클럽.',
  keywords: ['독서모임', '독서소셜클럽', '서울 소셜클럽', '독서 프로그램', '네트워킹', '직장인 모임', '전문직 모임'],
  alternates: {
    canonical: 'https://www.philipandsophy.kr/program',
  },
  openGraph: {
    title: '필립앤소피 독서 프로그램',
    description: '2주간 온라인 독서 프로그램 - 선별된 멤버들과 함께하는 프리미엄 독서 경험',
    url: 'https://www.philipandsophy.kr/program',
    siteName: 'Philip & Sophy',
    images: [
      {
        url: '/image/landing/PnS_Program_1.webp',
        width: 1170,
        height: 3963,
        alt: '필립앤소피 독서 프로그램',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '필립앤소피 독서 프로그램',
    description: '2주간 온라인 독서 프로그램 - 선별된 멤버들과 함께하는 프리미엄 독서 경험',
    images: ['/image/landing/PnS_Program_1.webp'],
  },
};

export default function ServicePage() {
  return <ServicePageClient />;
}
