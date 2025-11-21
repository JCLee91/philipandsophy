'use client';

import type { Notice } from '@/types/database';

/**
 * 공지사항 유틸리티 함수
 */

/**
 * 공지가 발행된 상태인지 확인
 *
 * @param notice - 공지 객체 또는 Firestore 문서 데이터
 * @returns true if published or no status field
 */
export const isPublishedNotice = (notice: Notice | any): boolean => {
  const status = notice?.status;
  return !status || status === 'published';
};
