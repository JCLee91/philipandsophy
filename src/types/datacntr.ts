/**
 * Data Center 타입 정의
 */

// 통계 메트릭
export interface OverviewStats {
  totalCohorts: number;
  totalParticipants: number;
  todaySubmissions: number;
  totalSubmissions: number;
  totalNotices: number;
  totalMessages: number;
  pushEnabledCount: number; // 푸시 알림 허용 인원
}

// 활동 지표 (일별)
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  submissions: number;
  newParticipants: number;
  messages: number;
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
}

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
