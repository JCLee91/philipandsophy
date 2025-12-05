'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Filter, BookOpen, Eye, Edit } from 'lucide-react';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import { useDatacntrAuth, useFetchWithAuth, useTableState } from '@/hooks/datacntr';
import { DatacntrPageShell } from '@/components/datacntr/layout';
import { DatacntrDropdownMenu, type DropdownMenuItem } from '@/components/datacntr/common';
import DataTable, { Column } from '@/components/datacntr/table/DataTable';
import TableSearch from '@/components/datacntr/table/TableSearch';
import TablePagination from '@/components/datacntr/table/TablePagination';
import { dataCenterParticipantSchema, type DataCenterParticipant } from '@/types/datacntr';
import FormSelect from '@/components/datacntr/form/FormSelect';
import ParticipantEditDialog from '@/components/datacntr/participants/ParticipantEditDialog';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirebaseFunctions, getFirebaseAuth } from '@/lib/firebase/client';

export const dynamic = 'force-dynamic';

type ParticipantRow = DataCenterParticipant;

type FilterState = {
  pushToken: 'all' | 'enabled' | 'disabled';
};

export default function ParticipantsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, needsCohortSelection, selectedCohortId } = useDatacntrAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantRow | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // 데이터 fetch
  const { data: rawData, isLoading: dataLoading, refetch } = useFetchWithAuth<unknown[]>({
    url: `/api/datacntr/participants?cohortId=${selectedCohortId}`,
    enabled: !!selectedCohortId,
    deps: [selectedCohortId],
  });

  // 데이터 파싱
  const participants = rawData
    ? (dataCenterParticipantSchema.array().parse(rawData) as ParticipantRow[])
    : [];

  // 테이블 상태 관리
  const {
    paginatedData,
    filteredData,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    handleSort,
    filters,
    setFilters,
    currentPage,
    totalPages,
    setCurrentPage,
    itemsPerPage,
  } = useTableState<ParticipantRow, FilterState>({
    data: participants,
    initialFilters: { pushToken: 'all' },
    searchFields: ['name', 'phoneNumber', 'cohortName'],
    filterFn: (item, filters) => {
      if (filters.pushToken === 'enabled') return !!item.hasPushToken;
      if (filters.pushToken === 'disabled') return !item.hasPushToken;
      return true;
    },
  });

  const handleImpersonate = async (targetUid: string, name: string) => {
    if (!confirm(`정말 '${name}' 님으로 로그인하시겠습니까?\n관리자 세션은 종료되며 해당 유저의 화면을 보게 됩니다.`)) {
      return;
    }

    try {
      setIsImpersonating(true);
      const functions = getFirebaseFunctions();
      const getImpersonationToken = httpsCallable(functions, 'getImpersonationToken');

      const result = await getImpersonationToken({ targetUid });
      const { customToken, adminToken } = result.data as { customToken: string; adminToken: string };

      if (adminToken) {
        sessionStorage.setItem('pns_admin_token', adminToken);
      }
      sessionStorage.setItem('pns_admin_impersonation', 'true');
      sessionStorage.setItem('pns_impersonation_return_url', '/datacntr/participants');

      const auth = getFirebaseAuth();
      await signInWithCustomToken(auth, customToken);
      router.push('/app');
    } catch (error) {
      console.error('Impersonation failed:', error);
      alert('유저로 로그인하기 실패했습니다. 권한을 확인해주세요.');
      setIsImpersonating(false);
    }
  };

  const getDropdownItems = (p: ParticipantRow): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [
      {
        label: '정보 수정',
        icon: Edit,
        onClick: () => setEditingParticipant(p),
      },
      {
        label: '프로필북 보기',
        icon: BookOpen,
        onClick: () => window.open(`/app/profile/${p.id}`, '_blank'),
      },
    ];

    // 본인(관리자)이 아닌 경우에만 표시
    if (p.firebaseUid !== user?.uid) {
      items.push({
        label: '이 유저로 보기',
        icon: Eye,
        onClick: () => handleImpersonate(p.firebaseUid, p.name),
        variant: 'warning',
        separator: true,
      });
    }

    return items;
  };

  const columns: Column<ParticipantRow>[] = [
    { key: 'name', header: '이름', sortable: true, width: '12%' },
    {
      key: 'gender',
      header: '성별',
      render: (p) => (p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '-'),
      width: '8%',
    },
    { key: 'occupation', header: '직업', render: (p) => p.occupation || '-', width: '12%' },
    { key: 'cohortName', header: '코호트', sortable: true, width: '12%' },
    {
      key: 'submissionCount',
      header: '인증',
      sortable: true,
      render: (p) => `${p.submissionCount}회`,
      width: '10%',
    },
    { key: 'phoneNumber', header: '전화번호', width: '15%' },
    {
      key: 'hasPushToken',
      header: '푸시 알림',
      sortable: true,
      render: (p) =>
        p.hasPushToken ? (
          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            허용
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
            <XCircle className="h-4 w-4" />
            거부
          </span>
        ),
      width: '12%',
    },
    {
      key: 'createdAt',
      header: '가입일',
      sortable: true,
      render: (p) => formatTimestampKST(p.createdAt, 'yy.MM.dd'),
      width: '10%',
    },
    {
      key: 'actions',
      header: '액션',
      width: '8%',
      render: (p) => <DatacntrDropdownMenu items={getDropdownItems(p)} />,
    },
  ];

  const isLoading = authLoading || dataLoading || isImpersonating;

  if (!user && !authLoading) return null;

  return (
    <DatacntrPageShell
      title="참가자 관리"
      description="전체 참가자 목록 및 활동 현황"
      isLoading={isLoading}
      requiresCohort
      hasCohortSelected={!!selectedCohortId}
    >
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
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">1</span>
            )}
          </button>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <FormSelect
              label="푸시 알림"
              value={filters.pushToken}
              onChange={(value) => setFilters({ pushToken: value as FilterState['pushToken'] })}
              options={[
                { value: 'all', label: '전체' },
                { value: 'enabled', label: '허용' },
                { value: 'disabled', label: '거부' },
              ]}
            />
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
      <DataTable<ParticipantRow>
        columns={columns}
        data={paginatedData}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={(key, direction) => {
          if (direction === null) {
            handleSort(key); // toggle to next state
          } else {
            handleSort(key);
          }
        }}
        isLoading={dataLoading}
        emptyMessage="참가자가 없습니다"
      />

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
        />
      )}

      <ParticipantEditDialog
        isOpen={!!editingParticipant}
        onClose={() => setEditingParticipant(null)}
        participant={editingParticipant}
        onSuccess={() => {
          setEditingParticipant(null);
          refetch();
        }}
      />
    </DatacntrPageShell>
  );
}
