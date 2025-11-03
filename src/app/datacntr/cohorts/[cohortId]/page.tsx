'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft, User, BookOpen, Calendar } from 'lucide-react';
import { formatISODateKST } from '@/lib/datacntr/timestamp';
import DataTable, { Column } from '@/components/datacntr/table/DataTable';
import type { Cohort } from '@/types/database';
import { cohortParticipantSchema, type CohortParticipant } from '@/types/datacntr';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
interface CohortDetailPageProps {
  params: Promise<{ cohortId: string }>;
}

export default function CohortDetailPage({ params }: CohortDetailPageProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [cohortId, setCohortId] = useState<string>('');
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [participants, setParticipants] = useState<CohortParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingUnlockDay, setIsUpdatingUnlockDay] = useState(false);
  const [tempUnlockDate, setTempUnlockDate] = useState<string>('');

  // Params 추출
  useEffect(() => {
    params.then((p) => setCohortId(p.cohortId));
  }, [params]);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 코호트 데이터 로드
  useEffect(() => {
    if (!user || !cohortId) return;

    const fetchCohortDetail = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/datacntr/cohorts/${cohortId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('코호트 상세 조회 실패');
        }

        const data = await response.json();
        const parsedParticipants = cohortParticipantSchema.array().parse(data.participants) as CohortParticipant[];
        setCohort(data.cohort);
        setParticipants(parsedParticipants);
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };

    fetchCohortDetail();
  }, [user, cohortId]);

  // cohort 로드 시 tempUnlockDate 초기화
  useEffect(() => {
    if (cohort?.profileUnlockDate) {
      setTempUnlockDate(cohort.profileUnlockDate);
    }
  }, [cohort?.profileUnlockDate]);

  // profileUnlockDate 업데이트
  const handleUpdateProfileUnlockDate = async (date: string | null) => {
    if (!user || !cohortId) return;

    setIsUpdatingUnlockDay(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/datacntr/cohorts/${cohortId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileUnlockDate: date }),
      });

      if (!response.ok) {
        throw new Error('프로필 공개 설정 업데이트 실패');
      }

      // 로컬 상태 업데이트
      setCohort(prev => prev ? { ...prev, profileUnlockDate: date } : null);
    } catch (error) {
      console.error('프로필 공개 설정 업데이트 실패:', error);
      alert('설정 업데이트에 실패했습니다.');
    } finally {
      setIsUpdatingUnlockDay(false);
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

  const columns: Column<CohortParticipant>[] = [
    {
      key: 'name',
      header: '이름',
      sortable: true,
      width: '20%',
    },
    {
      key: 'gender',
      header: '성별',
      render: (p) => {
        if (p.gender === 'male') return '남성';
        if (p.gender === 'female') return '여성';
        return '-';
      },
      width: '10%',
    },
    {
      key: 'phoneNumber',
      header: '전화번호',
      width: '15%',
    },
    {
      key: 'occupation',
      header: '직업',
      render: (p) => p.occupation || '-',
      width: '15%',
    },
    {
      key: 'currentBookTitle',
      header: '현재 읽는 책',
      render: (p) => p.currentBookTitle || '-',
      width: '25%',
    },
    {
      key: 'submissionCount',
      header: '인증 횟수',
      sortable: true,
      render: (p) => `${p.submissionCount}회`,
      width: '10%',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/datacntr/cohorts')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{cohort?.name}</h1>
            <p className="text-gray-600 mt-1">
              {cohort?.startDate && cohort?.endDate && (
                <>
                  {formatISODateKST(cohort.startDate, 'yyyy년 M월 d일')} ~{' '}
                  {formatISODateKST(cohort.endDate, 'yyyy년 M월 d일')}
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/datacntr/cohorts/${cohortId}/daily-questions`)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Daily Questions 관리
        </button>
      </div>

      {/* 프로필 공개 설정 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">프로필북 공개 설정</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            어제 인증한 사람들의 프로필을 모두 공개할 시작 날짜를 설정합니다.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              공개 시작 날짜:
            </label>
            <input
              type="date"
              value={tempUnlockDate}
              onChange={(e) => setTempUnlockDate(e.target.value)}
              disabled={isUpdatingUnlockDay}
              min={cohort?.programStartDate}
              max={cohort?.endDate}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleUpdateProfileUnlockDate(tempUnlockDate || null)}
              disabled={isUpdatingUnlockDay || tempUnlockDate === (cohort?.profileUnlockDate ?? '')}
              className="px-3 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setTempUnlockDate('');
                handleUpdateProfileUnlockDate(null);
              }}
              disabled={isUpdatingUnlockDay || !cohort?.profileUnlockDate}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              초기화
            </button>
            {isUpdatingUnlockDay && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </div>
          <p className="text-xs text-gray-500">
            {cohort?.profileUnlockDate
              ? `${formatISODateKST(cohort.profileUnlockDate, 'yyyy년 M월 d일')}부터 오늘 인증한 사람은 어제 인증한 모든 사람의 프로필을 볼 수 있습니다.`
              : '기본 설정: 매칭된 4명만 볼 수 있습니다.'
            }
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">참가자 수</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{participants.length}명</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <User className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 인증 수</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {participants.reduce((sum, p) => sum + p.submissionCount, 0)}회
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 인증률</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {participants.length > 0
                  ? Math.round(
                      (participants.reduce((sum, p) => sum + p.submissionCount, 0) /
                        participants.length) *
                        10
                    ) / 10
                  : 0}
                회
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 참가자 테이블 */}
      <DataTable<CohortParticipant> columns={columns} data={participants} isLoading={isLoading} emptyMessage="참가자가 없습니다" />
    </div>
  );
}
