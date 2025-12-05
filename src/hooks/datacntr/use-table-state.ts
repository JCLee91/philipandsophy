'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { SortDirection } from '@/components/datacntr/table/DataTable';

interface UseTableStateOptions<T, F extends Record<string, unknown> = Record<string, unknown>> {
  /** 원본 데이터 */
  data: T[];
  /** 초기 필터 상태 */
  initialFilters?: F;
  /** 페이지당 아이템 수 (기본: 50) */
  itemsPerPage?: number;
  /** 기본 정렬 키 */
  defaultSortKey?: string;
  /** 기본 정렬 방향 */
  defaultSortDirection?: SortDirection;
  /** 검색 대상 필드 */
  searchFields?: (keyof T)[];
  /** 커스텀 검색 함수 */
  searchFn?: (item: T, query: string) => boolean;
  /** 커스텀 정렬 함수 */
  sortFn?: (a: T, b: T, key: string, direction: SortDirection) => number;
  /** 커스텀 필터 함수 */
  filterFn?: (item: T, filters: F) => boolean;
}

interface UseTableStateReturn<T, F extends Record<string, unknown>> {
  /** 필터링/정렬된 전체 데이터 */
  filteredData: T[];
  /** 현재 페이지 데이터 */
  paginatedData: T[];

  /** 검색어 */
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  /** 정렬 상태 */
  sortKey: string;
  sortDirection: SortDirection;
  handleSort: (key: string) => void;

  /** 필터 상태 */
  filters: F;
  setFilters: (filters: F | ((prev: F) => F)) => void;
  resetFilters: () => void;

  /** 페이지네이션 */
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Timestamp 객체에서 seconds 추출
 * Firebase Admin SDK: { _seconds, _nanoseconds }
 * Firebase Client SDK: { seconds, nanoseconds }
 */
function getTimestampSeconds(val: unknown): number {
  if (!val || typeof val !== 'object') return 0;
  const obj = val as Record<string, unknown>;
  if ('seconds' in obj && typeof obj.seconds === 'number') return obj.seconds;
  if ('_seconds' in obj && typeof obj._seconds === 'number') return obj._seconds;
  return 0;
}

/**
 * 기본 정렬 함수
 */
function defaultSortFn<T>(a: T, b: T, key: string, direction: SortDirection): number {
  if (!direction) return 0;

  const aValue = (a as Record<string, unknown>)[key];
  const bValue = (b as Record<string, unknown>)[key];

  // Null 처리
  if (aValue === undefined || aValue === null) return 1;
  if (bValue === undefined || bValue === null) return -1;

  // Timestamp 타입 처리
  if (
    typeof aValue === 'object' &&
    ('seconds' in (aValue as object) || '_seconds' in (aValue as object))
  ) {
    const aTime = getTimestampSeconds(aValue);
    const bTime = getTimestampSeconds(bValue);
    return direction === 'asc' ? aTime - bTime : bTime - aTime;
  }

  // 불리언 타입 처리
  if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
    return direction === 'asc'
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  }

  // 숫자 타입 처리
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return direction === 'asc' ? aValue - bValue : bValue - aValue;
  }

  // 문자열 타입 처리
  const aStr = String(aValue).toLowerCase();
  const bStr = String(bValue).toLowerCase();
  return direction === 'asc'
    ? aStr.localeCompare(bStr, 'ko')
    : bStr.localeCompare(aStr, 'ko');
}

/**
 * 데이터센터 테이블 상태 관리 훅
 * - 검색, 필터, 정렬, 페이지네이션 통합
 */
export function useTableState<
  T extends { id: string },
  F extends Record<string, unknown> = Record<string, unknown>,
>({
  data,
  initialFilters = {} as F,
  itemsPerPage = 50,
  defaultSortKey = '',
  defaultSortDirection = null,
  searchFields,
  searchFn,
  sortFn,
  filterFn,
}: UseTableStateOptions<T, F>): UseTableStateReturn<T, F> {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [filters, setFilters] = useState<F>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);

  // 검색, 필터, 정렬 적용
  const filteredData = useMemo(() => {
    let result = [...data];

    // 검색 적용
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (searchFn) {
        result = result.filter((item) => searchFn(item, query));
      } else if (searchFields?.length) {
        result = result.filter((item) =>
          searchFields.some((field) => {
            const value = (item as Record<string, unknown>)[field as string];
            return value != null && String(value).toLowerCase().includes(query);
          })
        );
      }
    }

    // 필터 적용
    if (filterFn && Object.keys(filters).length > 0) {
      result = result.filter((item) => filterFn(item, filters));
    }

    // 정렬 적용
    if (sortKey && sortDirection) {
      const sorter = sortFn || defaultSortFn;
      result.sort((a, b) => sorter(a, b, sortKey, sortDirection));
    }

    return result;
  }, [data, searchQuery, searchFields, searchFn, filters, filterFn, sortKey, sortDirection, sortFn]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // 필터/검색 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // 정렬 핸들러 (토글 방식: asc → desc → null)
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else if (sortDirection === 'desc') {
          setSortDirection(null);
          setSortKey('');
        } else {
          setSortDirection('asc');
        }
      } else {
        setSortKey(key);
        setSortDirection('asc');
      }
    },
    [sortKey, sortDirection]
  );

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchQuery('');
  }, [initialFilters]);

  return {
    filteredData,
    paginatedData,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    handleSort,
    filters,
    setFilters,
    resetFilters,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems: filteredData.length,
    itemsPerPage,
  };
}
