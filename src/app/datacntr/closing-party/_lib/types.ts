import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ClosingPartyStats, ClosingPartyGroup } from '@/types/database';

/**
 * 참가자별 인증 횟수
 */
export interface ParticipantSubmissionCount {
  participantId: string;
  name: string;
  submissionCount: number;
}

/**
 * 통계 API 응답 타입
 */
export interface StatsResponse {
  stats: ClosingPartyStats | null;
  isCalculated: boolean;
  canCalculate: boolean;
  programEnded: boolean;
  calculationAvailableAt: string;
  message?: string;
  participantSubmissions?: ParticipantSubmissionCount[];
}

/**
 * 조 편성 API 응답 타입
 */
export interface GroupsResponse {
  groups: ClosingPartyGroup[] | null;
  groupsRound2: ClosingPartyGroup[] | null;
  groupFormationAt: any;
  groupFormationAtRound2: any;
  hasClusterData: boolean;
  totalParticipants: number;
}

/**
 * Firestore 타임스탬프 포맷팅
 */
export function formatTimestamp(timestamp: any): string {
  try {
    if (timestamp?.seconds) {
      return format(new Date(timestamp.seconds * 1000), 'yyyy.MM.dd HH:mm', { locale: ko });
    }
    if (timestamp?._seconds) {
      return format(new Date(timestamp._seconds * 1000), 'yyyy.MM.dd HH:mm', { locale: ko });
    }
    return format(new Date(timestamp), 'yyyy.MM.dd HH:mm', { locale: ko });
  } catch {
    return '-';
  }
}
