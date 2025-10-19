/**
 * Data Center 타입 정의
 */

import { z } from 'zod';

// 통계 메트릭
export interface OverviewStats {
  totalCohorts: number;
  totalParticipants: number;
  todaySubmissions: number;
  totalSubmissions: number;
  totalNotices: number;
  totalMessages: number;
  pushEnabledCount: number; // 푸시 알림 허용 인원
  // 참가자 활동 상태
  activeParticipants: number; // 3일 이내 활동
  moderateParticipants: number; // 4-7일 활동
  dormantParticipants: number; // 7일 이상 미활동
  // 주간 참여율
  weeklyParticipationRate: number; // 이번 주 인증 참가자 비율 (0-100)
}

// 활동 지표 (일별)
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  pushEnabled: number; // 푸시 알림 허용 수
  submissions: number; // 독서 인증 횟수
  avgReviewLength: number; // 리뷰 평균 글자수
  avgAnswerLength: number; // 가치관 답변 평균 글자수
}

// 코호트 통계
export interface CohortStats {
  id: string;
  name: string;
  participantCount: number;
  submissionCount: number;
  averageSubmissionRate: number; // 0-100
  matchingCount: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// 참가자 데이터 (테이블용)
export interface ParticipantRowData {
  id: string;
  name: string;
  cohortName: string;
  phoneNumber: string;
  gender?: 'male' | 'female' | 'other';
  joinedAt: string;
  lastActivityAt: string;
  submissionCount: number;
  currentBookTitle?: string;
  isActive: boolean; // 세션 활성 여부
  engagementScore?: number; // 인게이지먼트 점수 (0-100)
  engagementLevel?: 'high' | 'medium' | 'low'; // 인게이지먼트 등급
  hasPushToken?: boolean; // 푸시 알림 허용 여부
  activityStatus?: 'active' | 'moderate' | 'dormant'; // 활동 상태
}

export const sanitizedParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  cohortId: z.string(),
  phoneNumber: z.string().default(''), // 기본값 처리로 ?? '' 불필요
  gender: z.enum(['male', 'female', 'other']).optional(),
  profileImage: z.string().optional(),
  profileImageCircle: z.string().optional(),
  occupation: z.string().optional(),
  bio: z.string().optional(),
  currentBookTitle: z.string().optional(),
  currentBookAuthor: z.string().optional(),
  currentBookCoverUrl: z.string().optional(),
  createdAt: z.any(), // Firestore Timestamp (서버/클라이언트 혼용)
  lastActivityAt: z.any().optional(),
});

// Data Center 참가자 응답 스키마 (API → 클라이언트)
export const dataCenterParticipantSchema = sanitizedParticipantSchema.extend({
  cohortName: z.string(),
  submissionCount: z.number(),
  engagementScore: z.number().optional(),
  engagementLevel: z.enum(['high', 'medium', 'low']).optional(),
  activityStatus: z.enum(['active', 'moderate', 'dormant']).optional(),
  /**
   * hasPushToken: 푸시 알림 활성화 여부
   * - pushTokens 배열 우선 확인 (활성 토큰 존재 여부)
   * - pushTokens 없으면 레거시 pushToken 필드 폴백
   * - API 레이어에서 계산됨 (route.ts 참조)
   */
  hasPushToken: z.boolean(),
});

export type DataCenterParticipant = z.infer<typeof dataCenterParticipantSchema> & { id: string };

// 코호트 상세 참가자 응답 스키마
export const cohortParticipantSchema = sanitizedParticipantSchema.extend({
  submissionCount: z.number(),
});

export type CohortParticipant = z.infer<typeof cohortParticipantSchema> & { id: string };
export type SanitizedParticipant = z.infer<typeof sanitizedParticipantSchema> & { id: string };

// 인증 데이터 (카드용)
export interface SubmissionCardData {
  id: string;
  participantId: string;
  participantName: string;
  participantImage?: string;
  bookTitle: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
  bookImageUrl: string; // 인증 사진
  review: string;
  dailyQuestion: string;
  dailyAnswer: string;
  submittedAt: string;
  submissionDate: string;
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 필터 옵션
export interface ParticipantFilter {
  cohortId?: string;
  gender?: 'male' | 'female' | 'other';
  submissionRateRange?: '0-25' | '25-50' | '50-75' | '75-100';
  isActive?: boolean;
  search?: string; // 이름 또는 전화번호
}

export interface SubmissionFilter {
  cohortId?: string;
  participantId?: string;
  startDate?: string;
  endDate?: string;
}

// CSV 내보내기 요청
export interface ExportRequest {
  type: 'participants' | 'submissions';
  filter?: ParticipantFilter | SubmissionFilter;
}

// 독서 인증 분석 통계
export interface SubmissionAnalytics {
  timeDistribution: Array<{
    timeRange: string;
    count: number;
    percentage: number;
  }>;
  bookDiversity: {
    totalSubmissions: number;
    uniqueBookCount: number;
    averageDuplication: number;
    topBooks: Array<{
      title: string;
      count: number;
    }>;
  };
  reviewQuality: {
    averageReviewLength: number;
    longReviewPercentage: number;
    coverImagePercentage: number;
  };
}
