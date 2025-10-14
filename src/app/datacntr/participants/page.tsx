'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { format } from 'date-fns';
import DataTable, { Column, SortDirection } from '@/components/datacntr/table/DataTable';
import TableSearch from '@/components/datacntr/table/TableSearch';
import TablePagination from '@/components/datacntr/table/TablePagination';
import type { Participant } from '@/types/database';

interface ParticipantWithCohort extends Participant {
  cohortName: string;
  submissionCount: number;
}

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

  // 검색 필터링
  useEffect(() => {
    let filtered = [...participants];

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phoneNumber.includes(searchQuery) ||
          p.cohortName.toLowerCase().includes(searchQuery.toLowerCase())
      );
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
  }, [searchQuery, sortKey, sortDirection, participants]);

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
      width: '12%',
    },
    {
      key: 'cohortName',
      header: '코호트',
      sortable: true,
      width: '8%',
    },
    {
      key: 'gender',
      header: '성별',
      render: (p) => {
        if (p.gender === 'male') return '남성';
        if (p.gender === 'female') return '여성';
        return '-';
      },
      width: '6%',
    },
    {
      key: 'phoneNumber',
      header: '전화번호',
      width: '12%',
    },
    {
      key: 'occupation',
      header: '직업',
      render: (p) => p.occupation || '-',
      width: '12%',
    },
    {
      key: 'currentBookTitle',
      header: '현재 읽는 책',
      render: (p) => p.currentBookTitle || '-',
      width: '18%',
    },
    {
      key: 'submissionCount',
      header: '인증',
      sortable: true,
      render: (p) => `${p.submissionCount}회`,
      width: '8%',
    },
    {
      key: 'pushToken',
      header: '알림',
      sortable: true,
      render: (p) => {
        if (p.pushToken) {
          return (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              허용
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-gray-400">
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

      {/* 검색 */}
      <div className="mb-6">
        <TableSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="이름, 전화번호, 코호트로 검색..."
        />
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
