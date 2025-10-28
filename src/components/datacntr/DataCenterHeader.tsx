'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useDatacntrStore } from '@/stores/datacntr-store';
import type { Cohort } from '@/types/database';
import FormSelect from '@/components/datacntr/form/FormSelect';

export default function DataCenterHeader() {
  const { user, logout } = useAuth();
  const { selectedCohortId, setSelectedCohortId } = useDatacntrStore();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  // 기수 목록 로드
  useEffect(() => {
    if (!user) return;

    const fetchCohorts = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCohorts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        logger.error('기수 목록 조회 실패 (datacntr-header)', error);
      }
    };

    fetchCohorts();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      logger.info('Data Center 로그아웃 성공');

      // 로그아웃 후 로그인 페이지로 리다이렉트
      window.location.href = '/datacntr/login';
    } catch (error) {
      logger.error('로그아웃 실패:', error);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold text-gray-900">Data Center</h2>

        {/* 기수 선택 드롭다운 */}
        <FormSelect
          value={selectedCohortId}
          onChange={setSelectedCohortId}
          options={[
            { value: 'all', label: '전체 기수' },
            ...cohorts.map((cohort) => ({
              value: cohort.id,
              label: cohort.name,
            })),
          ]}
          placeholder="기수 선택"
          className="w-[180px]"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{user?.email || '관리자'}</p>
          <p className="text-xs text-gray-500">관리자</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="로그아웃"
        >
          <LogOut className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
