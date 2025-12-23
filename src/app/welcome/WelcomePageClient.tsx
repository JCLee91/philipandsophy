'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import InvitationOpening from '@/components/welcome/InvitationOpening';
import WelcomeSplash from '@/components/welcome/WelcomeSplash';
import MemberShowcase from '@/components/welcome/MemberShowcase';
import BrandStory from '@/components/welcome/BrandStory';
import PaymentCard from '@/components/welcome/PaymentCard';
import { WelcomeVerifyResponse, WelcomeConfig } from '@/types/welcome';
import '@/styles/landing.css';

interface WelcomePageClientProps {
  token?: string;
}

interface MemberShowcaseData {
  total: number;
  showcase: { id: string; profileImage: string | null }[];
}

type PageState = 'loading' | 'success' | 'error' | 'expired' | 'invalid';

const MIN_SPLASH_TIME_MS = 1000;

export default function WelcomePageClient({ token }: WelcomePageClientProps) {
  const [state, setState] = useState<PageState>('loading');
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const [participant, setParticipant] = useState<{
    name: string;
    cohortName: string;
    welcomeMessage?: string;
  } | null>(null);
  const [bankAccount, setBankAccount] = useState<WelcomeConfig | null>(null);
  const [members, setMembers] = useState<MemberShowcaseData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 최소 스플래시 시간 보장
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, MIN_SPLASH_TIME_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setState('invalid');
        setErrorMessage('유효하지 않은 접근입니다.');
        return;
      }

      try {
        // 토큰 검증과 멤버 데이터를 병렬로 로드
        const [verifyRes, membersRes] = await Promise.all([
          fetch(`/api/welcome/verify?token=${token}`),
          fetch('/api/welcome/members'),
        ]);

        const verifyData: WelcomeVerifyResponse = await verifyRes.json();

        if (!verifyData.success) {
          if (verifyData.code === 'EXPIRED_TOKEN') {
            setState('expired');
            setErrorMessage('링크가 만료되었습니다. 고객센터로 문의해주세요.');
          } else {
            setState('invalid');
            setErrorMessage(verifyData.error || '유효하지 않은 링크입니다.');
          }
          return;
        }

        // 성공
        setParticipant(verifyData.participant || null);
        setBankAccount(verifyData.bankAccount || null);

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }

        setState('success');
      } catch {
        setState('error');
        setErrorMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    };

    fetchData();
  }, [token]);

  // Loading (API 로딩 중이거나 최소 스플래시 시간 미경과)
  if (state === 'loading' || !minSplashElapsed) {
    return <WelcomeSplash />;
  }

  // Error states
  if (state !== 'success') {
    return (
      <div className="landing-page min-h-screen flex items-center justify-center bg-black text-white px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h1 className="text-xl font-semibold mb-2">
            {state === 'expired' ? '링크 만료' : '접근 불가'}
          </h1>
          <p className="text-gray-400">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Success
  return (
    <main className="landing-page min-h-screen bg-black text-white selection:bg-white/20 selection:text-white">
      {/* Section 1: Opening */}
      <InvitationOpening
        name={participant?.name || '멤버'}
        welcomeMessage={participant?.welcomeMessage}
      />

      {/* Section 2: Member Showcase */}
      {members && members.showcase.length > 0 && (
        <MemberShowcase
          totalCount={members.total}
          staticImageSrc="/images/welcome-message.webp"
        />
      )}

      {/* Section 3: Program Info */}
      <BrandStory />

      {/* Section 5: Payment */}
      {bankAccount && <PaymentCard bankAccount={bankAccount} />}

      {/* Footer */}
      <footer className="bg-black py-16 text-center border-t border-white/5">
        <p className="text-gray-600 text-sm">
          © Philip & Sophy. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
