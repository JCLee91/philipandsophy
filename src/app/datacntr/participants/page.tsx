'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Filter } from 'lucide-react';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { format } from 'date-fns';
import DataTable, { Column, SortDirection } from '@/components/datacntr/table/DataTable';
import TableSearch from '@/components/datacntr/table/TableSearch';
import TablePagination from '@/components/datacntr/table/TablePagination';
import StatusBadge from '@/components/datacntr/common/StatusBadge';
import { ENGAGEMENT_LABELS, ENGAGEMENT_EMOJIS } from '@/lib/datacntr/engagement';
import type { Participant } from '@/types/database';

interface ParticipantWithCohort extends Participant {
  cohortName: string;
  submissionCount: number;
  engagementScore?: number;
  engagementLevel?: 'high' | 'medium' | 'low';
  activityStatus?: 'active' | 'moderate' | 'dormant';
  hasPushToken?: boolean;
}

type FilterState = {
  activityStatus: 'all' | 'active' | 'moderate' | 'dormant';
  engagementLevel: 'all' | 'high' | 'medium' | 'low';
  pushToken: 'all' | 'enabled' | 'disabled';
};

export default function ParticipantsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [participants, setParticipants] = useState<ParticipantWithCohort[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<ParticipantWithCohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    activityStatus: 'all',
    engagementLevel: 'all',
    pushToken: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 50;

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 참가자 데이터 로드
  useEffect(() => {
    if (!user) return;

    const fetchParticipants = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/participants', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('참가자 조회 실패');
        }

        const data = await response.json();
        setParticipants(data);
        setFilteredParticipants(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();
  }, [user]);

  // 검색 및 필터링
  useEffect(() => {
    let filtered = [...participants];

    // 텍스트 검색
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phoneNumber.includes(searchQuery) ||
          p.cohortName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 활동 상태 필터
    if (filters.activityStatus !== 'all') {
      filtered = filtered.filter((p) => p.activityStatus === filters.activityStatus);
    }

    // 인게이지먼트 등급 필터
    if (filters.engagementLevel !== 'all') {
      filtered = filtered.filter((p) => p.engagementLevel === filters.engagementLevel);
    }

    // 푸시 알림 필터
    if (filters.pushToken !== 'all') {
      if (filters.pushToken === 'enabled') {
        filtered = filtered.filter((p) => p.hasPushToken === true);
      } else {
        filtered = filtered.filter((p) => p.hasPushToken !== true);
      }
    }

    // 정렬
    if (sortKey && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortKey as keyof ParticipantWithCohort];
        const bValue = b[sortKey as keyof ParticipantWithCohort];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    setFilteredParticipants(filtered);
    setCurrentPage(1); // 필터링 시 첫 페이지로
  }, [searchQuery, filters, sortKey, sortDirection, participants]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  const columns: Column<ParticipantWithCohort>[] = [
    {
      key: 'name',
      header: '이름',
      sortable: true,
      width: '10%',
    },
    {
      key: 'cohortName',
      header: '코호트',
      sortable: true,
      width: '7%',
    },
    {
      key: 'engagementScore',
      header: '인게이지먼트',
      sortable: true,
      render: (p) => {
        if (!p.engagementScore || !p.engagementLevel) return '-';
        const emoji = ENGAGEMENT_EMOJIS[p.engagementLevel];
        const label = ENGAGEMENT_LABELS[p.engagementLevel];
        return (
          <span className="inline-flex items-center gap-1">
            {emoji} {p.engagementScore}점
            <span className="text-xs text-gray-500">({label})</span>
          </span>
        );
      },
      width: '12%',
    },
    {
      key: 'activityStatus',
      header: '활동',
      sortable: true,
      render: (p) => {
        if (!p.activityStatus) return '-';
        return <StatusBadge status={p.activityStatus} />;
      },
      width: '10%',
    },
    {
      key: 'submissionCount',
      header: '인증',
      sortable: true,
      render: (p) => `${p.submissionCount}회`,
      width: '7%',
    },
    {
      key: 'phoneNumber',
      header: '전화번호',
      width: '11%',
    },
    {
      key: 'currentBookTitle',
      header: '현재 읽는 책',
      render: (p) => p.currentBookTitle || '-',
      width: '15%',
    },
    {
      key: 'pushToken',
      header: '알림',
      sortable: true,
      render: (p) => {
        if (p.pushToken) {
          return (
            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              허용
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
            <XCircle className="h-4 w-4" />
            거부
          </span>
        );
      },
      width: '8%',
    },
    {
      key: 'createdAt',
      header: '가입일',
      sortable: true,
      render: (p) => {
        const date = safeTimestampToDate(p.createdAt);
        if (!date) return '-';
        return format(date, 'yy.MM.dd');
      },
      width: '8%',
    },
  ];

  // 페이지네이션
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredParticipants.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">참가자 관리</h1>
        <p className="text-gray-600 mt-2">전체 참가자 목록 및 활동 현황</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="이름, 전화번호, 코호트로 검색..."
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            필터
            {(filters.activityStatus !== 'all' ||
              filters.engagementLevel !== 'all' ||
              filters.pushToken !== 'all') && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {[
                  filters.activityStatus !== 'all',
                  filters.engagementLevel !== 'all',
                  filters.pushToken !== 'all',
                ].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 활동 상태 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  활동 상태
                </label>
                <select
                  value={filters.activityStatus}
                  onChange={(e) =>
                    setFilters({ ...filters, activityStatus: e.target.value as FilterState['activityStatus'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="active">활성 (3일 이내)</option>
                  <option value="moderate">보통 (4-7일)</option>
                  <option value="dormant">휴면 (7일 이상)</option>
                </select>
              </div>

              {/* 인게이지먼트 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  인게이지먼트
                </label>
                <select
                  value={filters.engagementLevel}
                  onChange={(e) =>
                    setFilters({ ...filters, engagementLevel: e.target.value as FilterState['engagementLevel'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="high">🟢 우수 (80-100점)</option>
                  <option value="medium">🟡 보통 (50-79점)</option>
                  <option value="low">🔴 저조 (0-49점)</option>
                </select>
              </div>

              {/* 푸시 알림 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  푸시 알림
                </label>
                <select
                  value={filters.pushToken}
                  onChange={(e) =>
                    setFilters({ ...filters, pushToken: e.target.value as FilterState['pushToken'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="enabled">허용</option>
                  <option value="disabled">거부</option>
                </select>
              </div>
            </div>

            {/* 필터 초기화 */}
            {(filters.activityStatus !== 'all' ||
              filters.engagementLevel !== 'all' ||
              filters.pushToken !== 'all') && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      activityStatus: 'all',
                      engagementLevel: 'all',
                      pushToken: 'all',
                    })
                  }
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  필터 초기화
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 테이블 */}
      <DataTable
        columns={columns}
        data={paginatedData}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
        }}
        isLoading={isLoading}
        emptyMessage="참가자가 없습니다"
      />

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredParticipants.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
