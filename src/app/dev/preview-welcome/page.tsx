'use client';

import { useEffect, useState } from 'react';
import InvitationOpening from '@/components/welcome/InvitationOpening';
import MemberShowcase from '@/components/welcome/MemberShowcase';
import BrandStory from '@/components/welcome/BrandStory';
import PaymentCard from '@/components/welcome/PaymentCard';
import WelcomeSplash from '@/components/welcome/WelcomeSplash';

// 테스트용 더미 데이터
const PREVIEW_DATA = {
  participant: {
    name: '정재환',
    cohortName: '5기',
    welcomeMessage:
      '바쁜 수의사 일과 중에도 석촌호수를 달리며 일상의 균형을 찾으시는 모습이 무척 인상 깊었어요. 전공 서적을 넘어 다양한 분야의 책을 통해 안목을 넓히고 싶다는 재환님의 열정이 이곳에서 빛나길 바랍니다. 필립앤소피에서 좋은 분들과 영감을 나누며 뜻깊은 시간 보내시길 기대하며 함께하게 되어 정말 반갑습니다.',
  },
  bankAccount: {
    bankName: '신한은행',
    accountNumber: '110-123-456789',
    accountHolder: '필립앤소피',
    amountDescription: '120,000원',
    note: '입금 확인 후 안내 메시지가 발송됩니다.',
  },
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
  const [showSplash, setShowSplash] = useState(true);

  // 스플래시 2초 후 콘텐츠 표시
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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

  if (showSplash) {
    return <WelcomeSplash />;
  }

  return (
    <main className="min-h-screen bg-black">
      {/* 개발용 배너 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black text-center py-2 text-sm font-medium">
        개발용 미리보기 - 실제 환영 페이지는 토큰이 필요합니다
      </div>

      <div className="pt-10">
        {/* 섹션 1: 오프닝 (승인 메시지) */}
        <InvitationOpening
          name={PREVIEW_DATA.participant.name}
          welcomeMessage={PREVIEW_DATA.participant.welcomeMessage}
        />

        {/* 섹션 2: 멤버 캐러셀 */}
        {!loading && members && (
          <MemberShowcase
            totalCount={members.total}
            staticImageSrc="/images/welcome-message.webp"
          />
        )}

        {/* 섹션 3: 브랜드 스토리 */}
        <BrandStory />

        {/* 섹션 5: 입금 안내 */}
        <PaymentCard bankAccount={PREVIEW_DATA.bankAccount} />

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
