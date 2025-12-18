'use client';

import { useEffect, useState } from 'react';
import WelcomeHero from '@/components/welcome/WelcomeHero';
import WelcomeVideo from '@/components/welcome/WelcomeVideo';
import WelcomeContent from '@/components/welcome/WelcomeContent';
import BankAccountCard from '@/components/welcome/BankAccountCard';
import MemberShowcase from '@/components/welcome/MemberShowcase';
import { WelcomeConfig } from '@/types/welcome';

// 테스트용 더미 데이터
const PREVIEW_DATA = {
  participant: {
    name: '이종찬',
    cohortName: '5기',
  },
  bankAccount: {
    bankName: '신한은행',
    accountNumber: '110-123-456789',
    accountHolder: '필립앤소피',
    amountDescription: '10만원',
    note: '입금 확인 후 안내 메시지가 발송됩니다.',
  } as WelcomeConfig,
};

interface MemberShowcaseData {
  total: number;
  showcase: {
    id: string;
    profileImage: string;
    displayName: string;
  }[];
}

export default function PreviewWelcomePage() {
  const [members, setMembers] = useState<MemberShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);

  // 실제 멤버 데이터 로드 (개발용)
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/welcome/members');
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return (
    <main className="min-h-screen bg-black">
      {/* 개발용 배너 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black text-center py-2 text-sm font-medium">
        개발용 미리보기 - 실제 환영 페이지는 토큰이 필요합니다
      </div>

      <div className="pt-10">
        {/* 섹션 1: 히어로 */}
        <WelcomeHero
          participantName={PREVIEW_DATA.participant.name}
          cohortName={PREVIEW_DATA.participant.cohortName}
        />

        {/* 섹션 2: 멤버 캐러셀 */}
        {!loading && members && (
          <MemberShowcase
            members={members.showcase}
            totalCount={members.total}
          />
        )}

        {/* 섹션 3: 현장 영상 */}
        <WelcomeVideo />

        {/* 섹션 4: 프로그램 하이라이트 */}
        <WelcomeContent />

        {/* 섹션 5: 입금 안내 */}
        <BankAccountCard bankAccount={PREVIEW_DATA.bankAccount} />

        {/* 푸터 */}
        <footer className="bg-gray-900 py-8 text-center">
          <p className="text-gray-500 text-sm">
            궁금한 점이 있으시면 카카오톡 채널로 문의해주세요.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            &copy; {new Date().getFullYear()} 필립앤소피. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
