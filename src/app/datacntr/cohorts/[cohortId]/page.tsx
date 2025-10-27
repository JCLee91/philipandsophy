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
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohortDetail();
  }, [user, cohortId]);

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
