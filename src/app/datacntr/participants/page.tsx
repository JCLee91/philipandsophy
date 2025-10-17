'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Filter } from 'lucide-react';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import DataTable, { Column, SortDirection } from '@/components/datacntr/table/DataTable';
import TableSearch from '@/components/datacntr/table/TableSearch';
import TablePagination from '@/components/datacntr/table/TablePagination';
import type { Participant } from '@/types/database';

interface ParticipantWithCohort extends Participant {
  cohortName: string;
  submissionCount: number;
  engagementScore?: number;
  engagementLevel?: 'high' | 'medium' | 'low';
  activityStatus?: 'active' | 'moderate' | 'dormant';
}

type FilterState = {
  pushToken: 'all' | 'enabled' | 'disabled';
  activityStatus?: 'all' | 'active' | 'moderate' | 'dormant';
  engagementLevel?: 'all' | 'high' | 'medium' | 'low';
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
    pushToken: 'all',
    activityStatus: 'all',
    engagementLevel: 'all',
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

    // 푸시 알림 필터
    if (filters.pushToken !== 'all') {
      if (filters.pushToken === 'enabled') {
        filtered = filtered.filter((p) => !!p.pushToken);
      } else {
        filtered = filtered.filter((p) => !p.pushToken);
      }
    }

    // 정렬
    if (sortKey && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortKey as keyof ParticipantWithCohort];
        const bValue = b[sortKey as keyof ParticipantWithCohort];

        // Null 처리
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        // Timestamp 타입 처리 (createdAt)
        if (sortKey === 'createdAt') {
          // Firebase Timestamp 객체 직접 비교
          const aTime = typeof aValue === 'object' && aValue !== null && 'seconds' in aValue
            ? (aValue as any).seconds
            : 0;
          const bTime = typeof bValue === 'object' && bValue !== null && 'seconds' in bValue
            ? (bValue as any).seconds
            : 0;

          return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
        }

        // 숫자 타입 처리 (submissionCount)
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // 문자열 타입 처리 (name, cohortName 등)
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        return sortDirection === 'asc'
          ? aStr.localeCompare(bStr, 'ko')
          : bStr.localeCompare(aStr, 'ko');
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
      width: '15%',
    },
    {
      key: 'cohortName',
      header: '코호트',
      sortable: true,
      width: '12%',
    },
    {
      key: 'submissionCount',
      header: '인증',
      sortable: true,
      render: (p) => `${p.submissionCount}회`,
      width: '10%',
    },
    {
      key: 'phoneNumber',
      header: '전화번호',
      width: '18%',
    },
    {
      key: 'pushToken',
      header: '푸시 알림',
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
      width: '12%',
    },
    {
      key: 'createdAt',
      header: '가입일',
      sortable: true,
      render: (p) => formatTimestampKST(p.createdAt, 'yy.MM.dd'),
      width: '12%',
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
            {filters.pushToken !== 'all' && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                1
              </span>
            )}
          </button>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div>
              {/* 푸시 알림 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  푸시 알림
                </label>
                <select
                  value={filters.pushToken}
                  onChange={(e) =>
                    setFilters({ pushToken: e.target.value as FilterState['pushToken'] })
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
            {filters.pushToken !== 'all' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setFilters({ pushToken: 'all' })}
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
