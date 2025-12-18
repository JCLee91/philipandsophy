import { Metadata } from 'next';
import WelcomePageClient from './WelcomePageClient';

export const metadata: Metadata = {
  title: '환영합니다 | 필립앤소피',
  description: '필립앤소피 정식 멤버로 초대되셨습니다.',
  robots: 'noindex, nofollow',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function WelcomePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  return <WelcomePageClient token={token} />;
}
