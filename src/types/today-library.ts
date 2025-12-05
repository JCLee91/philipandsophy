'use client';

import type { Participant, ReadingSubmission } from '@/types/database';

/**
 * V2 프로필북에서 사용되는 참가자 타입
 * 매칭 테마(similar/opposite) 정보를 포함
 */
export type FeaturedParticipant = Participant & { 
  theme: 'similar' | 'opposite';
};

/**
 * V3 클러스터 매칭에서 사용되는 멤버 타입
 * 인증 데이터와 감상평/가치관 답변 정보를 포함
 */
export type ClusterMemberWithSubmission = Participant & {
  submission?: ReadingSubmission;
  review: string;
  dailyAnswer: string;
  dailyQuestion: string;
  bookCoverUrl?: string;
  bookImageUrl?: string;
};
