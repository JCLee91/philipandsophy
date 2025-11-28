'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCohorts } from '@/hooks/use-cohorts';
import { appRoutes } from '@/lib/navigation';
import { logger } from '@/lib/logger';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
export default function CohortsPage() {
  const router = useRouter();
  const { participant, isLoading: authLoading } = useAuth();
  const { data: allCohorts = [], isLoading: cohortsLoading } = useAllCohorts();
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [userCohorts, setUserCohorts] = useState<typeof allCohorts>([]);

  // 유저가 참가한 코호트 필터링
  useEffect(() => {
    if (!participant?.phoneNumber || allCohorts.length === 0) return;

    const fetchUserCohorts = async () => {
      try {
        const { getAllParticipantsByPhoneNumber } = await import('@/lib/firebase');
        const allParticipants = await getAllParticipantsByPhoneNumber(participant.phoneNumber);

        const userCohortIds = allParticipants.map(p => p.cohortId);
        const filteredCohorts = allCohorts.filter(c => userCohortIds.includes(c.id));

        setUserCohorts(filteredCohorts);
      } catch (error) {
        logger.error('Failed to fetch user cohorts', error);
        setUserCohorts(allCohorts); // 에러 시 전체 표시
      }
    };

    fetchUserCohorts();
  }, [participant?.phoneNumber, allCohorts]);

  // 로그인 체크 및 1개 코호트만 참가한 경우 자동 이동
  useEffect(() => {
    if (!authLoading && !participant) {
      router.replace('/app');
      return;
    }

    // 관리자가 아니고 참가 코호트가 1개면 바로 채팅으로 이동
    const isAdmin = participant?.isAdministrator || participant?.isSuperAdmin;
    if (!isAdmin && userCohorts.length === 1) {
      router.replace(appRoutes.chat(userCohorts[0].id));
    }
  }, [authLoading, participant, router, userCohorts]);

  // 코호트 선택 처리
  const handleSelectCohort = (cohortId: string) => {
    setSelectedCohortId(cohortId);

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

  // 관리자 여부
  const isAdmin = participant?.isAdministrator || participant?.isSuperAdmin;

  // 표시할 코호트 (관리자: 전체, 일반 유저: 참가한 코호트만)
  const displayCohorts = isAdmin ? allCohorts : userCohorts;

  // 표시할 코호트가 없는 경우 (관리자가 아닐 때만 체크)
  if (!isAdmin && userCohorts.length === 0 && !cohortsLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">참가 중인 기수 없음</h2>
          <p className="text-sm text-muted-foreground text-center">
            참가 중인 기수가 없습니다.
          </p>
        </div>
      </PageTransition>
    );
  }

  // 관리자인데 전체 코호트가 없는 경우
  if (isAdmin && allCohorts.length === 0 && !cohortsLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">코호트 없음</h2>
          <p className="text-sm text-muted-foreground text-center">
            생성된 코호트가 없습니다.
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col min-h-screen bg-background">
        {/* 헤더 */}
        <TopBar title="기수 변경" align="left" />

        {/* 코호트 리스트 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-6 py-6 space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              {isAdmin ? '관리할 기수를 선택하세요' : '참가 중인 기수를 선택하세요'}
            </p>
            {displayCohorts.map((cohort) => {
              const isSelected = selectedCohortId === cohort.id;

              // 🔍 DEBUG: 초기 로드 시 선택 상태 확인
              if (isSelected) {
                console.log('🔍 Selected cohort detected:', {
                  cohortId: cohort.id,
                  cohortName: cohort.name,
                  selectedCohortId,
                  isEqual: selectedCohortId === cohort.id,
                  selectedType: typeof selectedCohortId,
                  cohortIdType: typeof cohort.id,
                });
              }

              return (
                <button
                  key={cohort.id}
                  onClick={() => handleSelectCohort(cohort.id)}
                  disabled={isSelected}
                  className={`
                    w-full bg-white border rounded-xl p-4 transition-all
                    ${isSelected
                      ? 'border-primary bg-primary/5 opacity-75 cursor-wait'
                      : 'border-gray-200 [@media(hover:hover)]:hover:border-gray-300 [@media(hover:hover)]:hover:bg-gray-50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      {/* 코호트 이름 */}
                      <div className="flex items-center gap-2 mb-2">
                        <Users className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
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
          <div className="max-w-md mx-auto px-6 py-4">
            <p className="text-xs text-gray-600 text-center">
              {isAdmin
                ? '관리자 권한으로 모든 기수에 접근할 수 있습니다'
                : '참가 중인 기수를 자유롭게 전환할 수 있습니다'}
            </p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
