'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MatchingResponse } from '@/types/matching';

// localStorage 상수
const STORAGE_VERSION = '1.0';
const STORAGE_TTL = 24 * 60 * 60 * 1000; // 24시간

interface UseMatchingStorageOptions {
  cohortId: string | null;
  todayDate: string;
}

interface UseMatchingStorageReturn {
  // Storage operations
  loadFromStorage: (key: string) => MatchingResponse | null;
  saveToStorage: (key: string, data: MatchingResponse) => void;
  removeFromStorage: (key: string) => void;

  // Storage keys
  PREVIEW_STORAGE_KEY: string;
  CONFIRMED_STORAGE_KEY: string;
  IN_PROGRESS_KEY: string;

  // Cleanup
  cleanupOldEntries: () => void;
}

/**
 * 매칭 관련 localStorage 관리를 위한 커스텀 훅
 *
 * localStorage에 저장된 매칭 데이터의 로드, 저장, 삭제, 정리를 캡슐화합니다.
 * TTL(24시간) 및 버전 체크를 자동으로 수행합니다.
 */
export function useMatchingStorage({
  cohortId,
  todayDate,
}: UseMatchingStorageOptions): UseMatchingStorageReturn {
  // Storage keys
  const PREVIEW_STORAGE_KEY = `matching-preview-${cohortId}-${todayDate}`;
  const CONFIRMED_STORAGE_KEY = `matching-confirmed-${cohortId}-${todayDate}`;
  const IN_PROGRESS_KEY = `matching-in-progress-${cohortId}-${todayDate}`;

  // Load from storage with validation
  const loadFromStorage = useCallback((key: string): MatchingResponse | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // 버전 체크
      if (parsed.version && parsed.version !== STORAGE_VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      // TTL 체크 (타임스탬프가 있는 경우)
      if (parsed.timestamp && Date.now() - parsed.timestamp > STORAGE_TTL) {
        localStorage.removeItem(key);
        return null;
      }

      // 데이터 구조 검증 (data 필드 또는 직접 MatchingResponse 형태)
      const data = parsed.data || parsed;
      if (!data.matching || !data.date) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch {
      // 손상된 데이터 제거
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore removal errors
      }
      return null;
    }
  }, []);

  // Save to storage with metadata
  const saveToStorage = useCallback((key: string, data: MatchingResponse) => {
    try {
      const stored = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(key, JSON.stringify(stored));
    } catch {
      // Silently fail on storage errors
    }
  }, []);

  // Remove from storage
  const removeFromStorage = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail on removal errors
    }
  }, []);

  // Cleanup old entries for this cohort
  const cleanupOldEntries = useCallback(() => {
    if (!cohortId) return;

    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        // 이 코호트의 매칭 관련 키이지만 오늘 날짜가 아닌 경우 삭제
        if (key.startsWith(`matching-preview-${cohortId}-`) && !key.includes(todayDate)) {
          localStorage.removeItem(key);
        }
        if (key.startsWith(`matching-confirmed-${cohortId}-`) && !key.includes(todayDate)) {
          localStorage.removeItem(key);
        }
        if (key.startsWith(`matching-in-progress-${cohortId}-`) && !key.includes(todayDate)) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Silently fail on cleanup errors
    }
  }, [cohortId, todayDate]);

  return {
    loadFromStorage,
    saveToStorage,
    removeFromStorage,
    PREVIEW_STORAGE_KEY,
    CONFIRMED_STORAGE_KEY,
    IN_PROGRESS_KEY,
    cleanupOldEntries,
  };
}
