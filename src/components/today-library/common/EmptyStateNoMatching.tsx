'use client';

import { useRouter } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import { appRoutes } from '@/lib/navigation';

type EmptyStateType = 'matching_in_progress' | 'no_matching';

interface EmptyStateNoMatchingProps {
  cohortId: string;
  currentUserId: string;
  type: EmptyStateType;
}

export default function EmptyStateNoMatching({
  cohortId,
  currentUserId,
  type,
}: EmptyStateNoMatchingProps) {
  const router = useRouter();

  if (type === 'matching_in_progress') {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />

          <main className="app-main-content flex flex-1 overflow-y-auto items-center justify-center bg-background">
            <div className="mx-auto max-w-md px-6">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="size-20 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg className="size-10 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">
                    오늘의 독서모임을 준비 중이에요
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    잠시 후 다시 확인해 주세요
                  </p>
                </div>

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

  // type === 'no_matching'
  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />

        <main className="app-main-content flex flex-1 overflow-y-auto items-center justify-center bg-background">
          <div className="mx-auto max-w-md px-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="size-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-lg text-gray-900">
                  아직 준비중이에요
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  독서를 인증하면 내일 오전 2시에 독서모임이 시작돼요
                </p>
              </div>

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
