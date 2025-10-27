'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminDb } from '@/lib/firebase/admin';
import { Loader2, Calendar, Users, CheckCircle, XCircle } from 'lucide-react';
import { formatISODateKST } from '@/lib/datacntr/timestamp';
import type { Cohort } from '@/types/database';


// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
export default function CohortsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingCohortId, setUpdatingCohortId] = useState<string | null>(null);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 코호트 데이터 로드
  useEffect(() => {
    if (!user) return;

    const fetchCohorts = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('코호트 조회 실패');
        }

        const data = await response.json();
        setCohorts(data);
      } catch (error) {
        setError('코호트 데이터를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, [user]);

  // 기수 활성화 상태 토글
  const handleToggleActive = async (cohortId: string, currentStatus: boolean) => {
    if (!user) return;

    const confirmed = confirm(
      `정말 이 기수를 ${currentStatus ? '종료' : '진행중으로 변경'}하시겠습니까?`
    );
    if (!confirmed) return;

    setUpdatingCohortId(cohortId);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/datacntr/cohorts/${cohortId}/toggle-active`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('상태 변경 실패');
      }

      // 로컬 상태 업데이트
      setCohorts(prev =>
        prev.map(cohort =>
          cohort.id === cohortId
            ? { ...cohort, isActive: !currentStatus }
            : cohort
        )
      );

      alert(`기수가 ${currentStatus ? '종료' : '진행중'}으로 변경되었습니다.`);
    } catch (error) {
      console.error(error);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setUpdatingCohortId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">코호트 관리</h1>
          <p className="text-gray-600 mt-2">기수별 참가자 및 활동 현황</p>
        </div>
        <button
          onClick={() => router.push('/datacntr/cohorts/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          + 새 기수 생성
        </button>
      </div>

      {/* 코호트 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cohorts.map((cohort) => {
          const startDate = formatISODateKST(cohort.startDate, 'yyyy년 M월 d일');
          const endDate = formatISODateKST(cohort.endDate, 'yyyy년 M월 d일');

          return (
            <div
              key={cohort.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{cohort.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${cohort.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                    {cohort.isActive ? '진행중' : '종료'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(cohort.id, cohort.isActive);
                    }}
                    disabled={updatingCohortId === cohort.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      cohort.isActive ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        cohort.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    >
                      {updatingCohortId === cohort.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* 날짜 정보 */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{startDate} ~ {endDate}</span>
                </div>
              </div>

              {/* 하단: 상세 보기 */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => router.push(`/datacntr/cohorts/${cohort.id}`)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  상세 보기 →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {cohorts.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">등록된 코호트가 없습니다</p>
        </div>
      )}
    </div>
  );
}
