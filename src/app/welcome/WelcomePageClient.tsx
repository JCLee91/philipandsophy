'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, XCircle } from 'lucide-react';
import WelcomeHero from '@/components/welcome/WelcomeHero';
import WelcomeVideo from '@/components/welcome/WelcomeVideo';
import WelcomeContent from '@/components/welcome/WelcomeContent';
import BankAccountCard from '@/components/welcome/BankAccountCard';
import MemberShowcase from '@/components/welcome/MemberShowcase';
import { WelcomeVerifyResponse } from '@/types/welcome';

interface WelcomePageClientProps {
  token?: string;
}

interface MemberShowcaseData {
  total: number;
  showcase: {
    id: string;
    profileImage: string;
    displayName: string;
  }[];
}

type PageState = 'loading' | 'success' | 'error' | 'expired' | 'not_found';

export default function WelcomePageClient({ token }: WelcomePageClientProps) {
  const [state, setState] = useState<PageState>('loading');
  const [data, setData] = useState<WelcomeVerifyResponse | null>(null);
  const [members, setMembers] = useState<MemberShowcaseData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('not_found');
      setErrorMessage('유효하지 않은 접근입니다.');
      return;
    }

    const verifyToken = async () => {
      try {
        // 토큰 검증과 멤버 데이터를 병렬로 로드
        const [verifyResponse, membersResponse] = await Promise.all([
          fetch(`/api/welcome/verify?token=${token}`),
          fetch('/api/welcome/members'),
        ]);

        const result: WelcomeVerifyResponse = await verifyResponse.json();

        if (result.success) {
          setState('success');
          setData(result);

          // 멤버 데이터 설정
          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            setMembers(membersData);
          }
        } else {
          if (result.code === 'EXPIRED_TOKEN') {
            setState('expired');
            setErrorMessage('링크가 만료되었습니다. 고객센터로 문의해주세요.');
          } else {
            setState('not_found');
            setErrorMessage(result.error || '유효하지 않은 링크입니다.');
          }
        }
      } catch {
        setState('error');
        setErrorMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    };

    verifyToken();
  }, [token]);

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">잠시만 기다려주세요...</p>
        </motion.div>
      </div>
    );
  }

  // Error states
  if (state !== 'success') {
    const Icon = state === 'expired' ? AlertCircle : XCircle;
    const iconColor = state === 'expired' ? 'text-amber-400' : 'text-red-400';

    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Icon className={`w-16 h-16 ${iconColor} mx-auto mb-6`} />
          <h1 className="text-2xl font-bold text-white mb-3">
            {state === 'expired' ? '링크 만료' : '접근 불가'}
          </h1>
          <p className="text-gray-400 mb-8">{errorMessage}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </motion.div>
      </div>
    );
  }

  // Success state
  return (
    <main className="min-h-screen bg-black">
      {/* 섹션 1: 히어로 */}
      <WelcomeHero
        participantName={data?.participant?.name || ''}
        cohortName={data?.participant?.cohortName || ''}
      />

      {/* 섹션 2: 멤버 캐러셀 */}
      {members && members.showcase.length > 0 && (
        <MemberShowcase members={members.showcase} totalCount={members.total} />
      )}

      {/* 섹션 3: 현장 영상 */}
      <WelcomeVideo />

      {/* 섹션 4: 프로그램 하이라이트 */}
      <WelcomeContent />

      {/* 섹션 5: 입금 안내 */}
      {data?.bankAccount && <BankAccountCard bankAccount={data.bankAccount} />}

      {/* 푸터 */}
      <footer className="bg-gray-900 py-8 text-center">
        <p className="text-gray-500 text-sm">
          궁금한 점이 있으시면 카카오톡 채널로 문의해주세요.
        </p>
        <p className="text-gray-600 text-xs mt-2">
          &copy; {new Date().getFullYear()} 필립앤소피. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
