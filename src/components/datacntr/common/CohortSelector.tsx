'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Cohort {
  id: string;
  name: string;
  isActive?: boolean;
}

interface CohortSelectorProps {
  /** 선택된 코호트 ID */
  value: string;
  /** 코호트 변경 핸들러 */
  onChange: (cohortId: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 레이블 표시 여부 */
  showLabel?: boolean;
  /** 레이블 텍스트 */
  label?: string;
  /** 필수 필드 여부 */
  required?: boolean;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 활성 코호트를 기본값으로 설정할지 여부 */
  autoSelectActive?: boolean;
  /** 외부에서 코호트 목록을 주입할 경우 */
  cohorts?: Cohort[];
  /** 코호트 로드 완료 콜백 */
  onCohortsLoaded?: (cohorts: Cohort[]) => void;
}

/**
 * 코호트 선택 드롭다운 컴포넌트
 *
 * notifications, notices 등 여러 페이지에서 재사용됩니다.
 * Firebase에서 코호트 목록을 자동으로 로드하거나 외부 주입을 받습니다.
 */
export default function CohortSelector({
  value,
  onChange,
  placeholder = '코호트를 선택하세요',
  showLabel = false,
  label = '코호트 선택',
  required = false,
  disabled = false,
  autoSelectActive = false,
  cohorts: externalCohorts,
  onCohortsLoaded,
}: CohortSelectorProps) {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>(externalCohorts || []);
  const [isLoading, setIsLoading] = useState(!externalCohorts);

  // 코호트 목록 조회 (외부 주입이 없는 경우)
  useEffect(() => {
    if (externalCohorts) {
      setCohorts(externalCohorts);
      return;
    }

    if (!user) return;

    const fetchCohorts = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts/list', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch cohorts');
        }

        const data = await response.json();
        const cohortsList: Cohort[] = data.cohorts;

        setCohorts(cohortsList);
        onCohortsLoaded?.(cohortsList);

        // 활성 코호트를 기본값으로 설정
        if (autoSelectActive && !value) {
          const activeCohort = cohortsList.find((c) => c.isActive);
          if (activeCohort) {
            onChange(activeCohort.id);
          } else if (cohortsList.length > 0) {
            onChange(cohortsList[0].id);
          }
        }
      } catch (error) {
        logger.error('코호트 목록 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, [user, externalCohorts, autoSelectActive, value, onChange, onCohortsLoaded]);

  return (
    <div>
      {showLabel && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? '로딩 중...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {cohorts.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-gray-500">
              {isLoading ? '코호트 목록 불러오는 중...' : '코호트가 없습니다'}
            </div>
          ) : (
            cohorts.map((cohort) => (
              <SelectItem key={cohort.id} value={cohort.id}>
                <div className="flex items-center gap-2">
                  <span>{cohort.name}</span>
                  {cohort.isActive && (
                    <span className="text-xs font-medium text-green-600">• 활성</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
