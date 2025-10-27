'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCohorts } from '@/hooks/use-cohorts';
import { appRoutes } from '@/lib/navigation';
import { logger } from '@/lib/logger';
import PageTransition from '@/components/PageTransition';


// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
export default function CohortsPage() {
  const router = useRouter();
  const { participant, isLoading: authLoading } = useAuth();
  const { data: cohorts = [], isLoading: cohortsLoading } = useAllCohorts();
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);

  // 권한 체크: 관리자만 접근 가능
  useEffect(() => {
    if (!authLoading && !participant) {
      logger.warn('코호트 선택: 로그인 필요');
      router.replace('/app');
      return;
    }

    if (!authLoading && participant && !participant.isAdministrator && !participant.isSuperAdmin) {
      logger.warn('코호트 선택: 관리자 권한 필요', { participantId: participant.id });
      // 일반 사용자는 자신의 코호트로 바로 이동
      router.replace(appRoutes.chat(participant.cohortId));
      return;
    }
  }, [authLoading, participant, router]);

  // 코호트 선택 처리
  const handleSelectCohort = (cohortId: string) => {
    setSelectedCohortId(cohortId);
    logger.info('코호트 선택됨', { cohortId });

    // 채팅 페이지로 이동
    router.push(appRoutes.chat(cohortId));
  };

  // 로딩 중
  if (authLoading || cohortsLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">코호트 불러오는 중...</p>
        </div>
      </PageTransition>
    );
  }

  // 관리자가 아니면 렌더링하지 않음 (리다이렉트 처리됨)
  if (!participant?.isAdministrator && !participant?.isSuperAdmin) {
    return null;
  }

  // 코호트가 없는 경우
  if (cohorts.length === 0) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">코호트 없음</h2>
          <p className="text-sm text-muted-foreground text-center">
            생성된 코호트가 없습니다.<br />
            데이터센터에서 코호트를 생성해주세요.
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col min-h-screen bg-background">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-md mx-auto px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">코호트 선택</h1>
            <p className="text-sm text-gray-600 mt-1">관리할 기수를 선택하세요</p>
          </div>
        </header>

        {/* 코호트 리스트 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-4 py-6 space-y-3">
            {cohorts.map((cohort) => {
              const isSelected = selectedCohortId === cohort.id;

              return (
                <button
                  key={cohort.id}
                  onClick={() => handleSelectCohort(cohort.id)}
                  disabled={isSelected}
                  className={`
                    w-full bg-white border rounded-xl p-4 transition-all
                    ${isSelected
                      ? 'border-primary bg-primary/5 opacity-75 cursor-wait'
                      : 'border-gray-200 hover:border-primary hover:bg-gray-50 active:scale-[0.98]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      {/* 코호트 이름 */}
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-gray-900">{cohort.name}</h3>
                        {cohort.isActive && (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            활성
                          </span>
                        )}
                      </div>

                      {/* 기간 */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {cohort.startDate} ~ {cohort.endDate}
                        </span>
                      </div>
                    </div>

                    {/* 화살표 아이콘 */}
                    {isSelected ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        {/* 안내 문구 */}
        <footer className="border-t border-gray-200 bg-gray-50">
          <div className="max-w-md mx-auto px-4 py-4">
            <p className="text-xs text-gray-600 text-center">
              관리자 권한으로 모든 코호트에 접근할 수 있습니다
            </p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
