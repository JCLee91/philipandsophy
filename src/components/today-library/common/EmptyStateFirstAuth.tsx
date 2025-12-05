'use client';

import { useRouter } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import { TopBar } from '@/components/common/headers';
import { appRoutes } from '@/lib/navigation';

interface EmptyStateFirstAuthProps {
  cohortId: string;
  currentUserId: string;
  variant: 'v2' | 'v3';
}

export default function EmptyStateFirstAuth({
  cohortId,
  currentUserId,
  variant,
}: EmptyStateFirstAuthProps) {
  const router = useRouter();

  const description = variant === 'v2' 
    ? '프로필 북은'
    : '독서모임 테이블은';
  
  const subDescription = variant === 'v2'
    ? '매일 새로운 멤버들의 프로필북이 도착합니다'
    : '매일 AI가 비슷한 생각을 한 멤버들을 연결해드립니다';

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <TopBar 
          title="오늘의 서재" 
          onBack={() => router.back()} 
          align="left" 
        />

        <main className="app-main-content flex flex-1 overflow-y-auto items-center justify-center bg-background">
          <div className="mx-auto max-w-md px-6">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="size-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-gray-900">
                  첫 인증을 완료했어요! 🎉
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {description} <strong className="text-gray-900">인증 다음날 오전 2시</strong>부터
                    <br />
                    열어볼 수 있어요
                  </p>
                  <p className="text-xs text-gray-500">
                    {subDescription}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={() => router.push(appRoutes.profile(currentUserId, cohortId))}
                className="bg-black text-white rounded-lg px-6 py-3 font-semibold text-base transition-colors hover:bg-gray-800 active:bg-gray-900"
              >
                내 프로필 북 보기
              </button>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
