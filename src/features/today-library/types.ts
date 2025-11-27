import type { Participant, Cluster, ReadingSubmission } from '@/types/database';

/**
 * 추천 참가자 (테마 정보 포함)
 */
export type FeaturedParticipant = Participant & {
  theme: 'similar' | 'opposite';
};

/**
 * 클러스터 멤버 + 인증 데이터
 */
export type ClusterMemberWithSubmission = Participant & {
  submission?: ReadingSubmission;
  review: string;
  dailyAnswer: string;
  dailyQuestion: string;
  bookCoverUrl?: string;
  bookImageUrl?: string;
};

/**
 * 클러스터 매칭 데이터
 */
export interface ClusterMatchingData {
  clusterId: string;
  cluster: Cluster;
  assignedIds: string[];
  matchingDate: string;
}

/**
 * 레거시 헤더 Props
 */
export interface LegacyHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}
