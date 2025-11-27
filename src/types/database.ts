import { Timestamp } from 'firebase/firestore';

/**
 * Database Types for Firestore Collections
 */

/**
 * Reading submission data structure (from Firestore)
 */
export interface SubmissionData {
  participantId: string;
  dailyQuestion: string;
  dailyAnswer: string;
  submissionDate: string;
}

/**
 * Participant data structure (from Firestore)
 */
export interface ParticipantData {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  isSuperAdmin?: boolean; // 슈퍼 관리자 (모든 프로필 열람, 리스트 미표시)
  isAdministrator?: boolean; // 일반 관리자 (공지사항 관리, 프로필 열람 제약 동일)
  isGhost?: boolean; // 고스트 참가자 (테스트용, 리스트 미표시, 오늘의 서재 접근 가능)
  cohortId: string;
  submissionCount?: number; // 누적 인증 횟수 (v2.0 랜덤 매칭용)
}

/**
 * Daily matching metadata shared across admin & participant views
 * @deprecated AI 매칭 시스템에서만 사용 (랜덤 매칭에서는 미사용)
 */
export interface DailyMatchingReasons {
  similar?: string;
  opposite?: string;
  summary?: string;
}

/**
 * 참가자별 프로필북 할당 정보
 * v2.0 (랜덤 매칭) 구조
 */
export interface DailyParticipantAssignment {
  // v2.0: 랜덤 매칭 (2025-11-07 이후)
  /** 할당된 프로필북 ID 배열 (누적 인증 기반 개수) */
  assigned?: string[];

  // v3.0: 클러스터 매칭 (2025-11-15 이후)
  /** 소속 클러스터 ID (v3.0) */
  clusterId?: string;

  // ============================================================
  // v1.0 레거시 필드 (과거 데이터 읽기 전용)
  // ============================================================

  /**
   * @deprecated v1.0 전용 - 새 코드에서 사용 금지
   * v2.0에서는 `assigned` 필드 사용
   * 레거시 데이터 호환을 위해 유지
   */
  similar?: string[];

  /**
   * @deprecated v1.0 전용 - 새 코드에서 사용 금지
   * v2.0에서는 `assigned` 필드 사용
   * 레거시 데이터 호환을 위해 유지
   */
  opposite?: string[];

  /**
   * @deprecated v1.0 전용 - 새 코드에서 사용 금지
   * v2.0 랜덤 매칭은 매칭 이유 없음
   * 레거시 데이터 호환을 위해 유지
   */
  reasons?: DailyMatchingReasons;
}

/**
 * 클러스터 정보 (v3.0)
 * AI가 하루 단위로 생성하는 독서 성향 그룹
 */
export interface Cluster {
  /** 클러스터 ID */
  id: string;
  /** 클러스터 이름 (예: "오늘의 사색파") */
  name: string;
  /** 이모지 */
  emoji: string;
  /** 클러스터링 기준 (예: "감상평", "가치관", "정서") */
  category: string;
  /** 오늘의 주제/테마 (AI가 분석한 공통점) */
  theme: string;
  /** 클러스터 멤버 ID 배열 */
  memberIds: string[];
  /** AI 분석 근거 */
  reasoning: string;
}

/**
 * 날짜별 프로필북 매칭 결과
 */
export interface DailyMatchingEntry {
  /** 참가자별 매칭 배정 정보 */
  assignments: Record<string, DailyParticipantAssignment>;

  /** 매칭 방식 (ai: AI 매칭, random: 랜덤 매칭, cluster: 클러스터 매칭) */
  matchingVersion?: 'ai' | 'random' | 'cluster';

  /** 클러스터 정보 (v3.0, matchingVersion === 'cluster'일 때만 존재) */
  clusters?: Record<string, Cluster>;

  // ============================================================
  // v1.0 레거시 필드 (과거 데이터 읽기 전용)
  // ============================================================

  /**
   * @deprecated v1.0 전용 - 더 이상 사용하지 않음
   * 레거시 데이터 호환을 위해 유지
   */
  similar?: string[];

  /**
   * @deprecated v1.0 전용 - 더 이상 사용하지 않음
   * 레거시 데이터 호환을 위해 유지
   */
  opposite?: string[];

  /**
   * @deprecated v1.0 전용 - 더 이상 사용하지 않음
   * 레거시 데이터 호환을 위해 유지
   */
  reasons?: DailyMatchingReasons;
}

/**
 * 기수 정보
 */
export interface Cohort {
  id: string; // 문서 ID
  name: string; // 기수 이름 (예: '1기')
  startDate: string; // 시작일 (ISO 8601)
  endDate: string; // 종료일 (ISO 8601)
  programStartDate: string; // 🆕 Daily Questions 시작일 (ISO 8601)
  isActive: boolean; // 활성화 여부
  dailyFeaturedParticipants?: Record<string, DailyMatchingEntry>; // 날짜별 추천 참가자 및 매칭 결과
  participantCount?: number; // 🆕 참가자 수 (계산 필드, optional)
  totalDays?: number; // 🆕 프로그램 총 일수 (계산 필드, optional)
  profileUnlockDate?: string | null; // 🆕 어제 인증자 전체 공개 시작 날짜 (null: 기본 2x2만, "2025-10-08": 해당 날짜부터 전체 공개, ISO 8601)
  useClusterMatching?: boolean; // 🆕 클러스터 매칭 사용 여부 (true: v3.0 클러스터, false/undefined: v2.0 랜덤)
  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
  type?: 'regular' | 'meetup'; // 🆕 기수 타입 (기본값: 'regular')
  location?: string; // 🆕 모임 장소 (meetup 타입일 경우)
  meetupDate?: string; // 🆕 모임 날짜 (meetup 타입일 경우, YYYY-MM-DD)

  // 🆕 소셜링 시스템 (Phase-based Socializing v2)
  socializingPhase?: 'idle' | 'option_vote' | 'attendance_check' | 'confirmed';
  socializingDeadline?: string;  // 투표/참불 마감 시간 (ISO 8601, 예: "2025-11-27T18:00:00+09:00")
  socializingOpenChatUrl?: string | null; // 오픈카톡방 URL (Phase 3 확정 시 입력)
  socializingOptions?: {
    combinations: Array<{
      id: string;        // 고유 ID (예: "opt-1")
      date: string;      // YYYY-MM-DD
      time: string;      // HH:mm
      location: string;  // 장소명
    }>;
  };
  socializingResult?: {
    optionId: string;      // 확정된 선택지 ID
    date: string;          // 확정된 날짜
    time: string;          // 확정된 시간
    location: string;      // 확정된 장소
    attendees: string[];   // 참석자 participant IDs
    absentees: string[];   // 불참자 participant IDs
  };
}

/**
 * 책 읽기 이력
 */
export interface BookHistoryEntry {
  title: string; // 책 제목
  startedAt: Timestamp; // 읽기 시작 일시
  endedAt: Timestamp | null; // 읽기 종료 일시 (null: 현재 읽는 중)
}

/**
 * Daily Question (기수별 서브컬렉션)
 * Firestore 경로: cohorts/{cohortId}/daily_questions/{dayNumber}
 */
export interface DailyQuestion {
  id: string; // 문서 ID (dayNumber와 동일, 문자열)
  dayNumber: number; // Day 번호 (1, 2, 3, ..., 14)
  date: string; // 해당 날짜 (ISO 8601: "2025-10-11")
  category: string; // 질문 카테고리 (예: "생활 패턴", "가치관 & 삶")
  question: string; // 질문 내용
  order: number; // 정렬용 (dayNumber와 동일)
  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
}

/**
 * 푸시 알림 토큰 정보 (멀티 디바이스 지원) - FCM + Web Push 통합
 */
export interface PushTokenEntry {
  deviceId: string; // 디바이스 고유 ID (브라우저 fingerprint)
  type: 'fcm' | 'webpush'; // 푸시 채널 타입 (Android=fcm, iOS=webpush)
  token: string; // FCM 토큰 또는 Web Push endpoint
  updatedAt: Timestamp; // 토큰 마지막 갱신 시간
  userAgent?: string; // User Agent 정보 (디바이스 식별용)
  lastUsedAt?: Timestamp; // 마지막 사용 시간 (토큰 만료 판별용)
}

/**
 * Web Push 구독 정보 (표준 Web Push API) - iOS Safari + All Platforms
 */
export interface WebPushSubscriptionData {
  endpoint: string; // Push endpoint (e.g., https://web.push.apple.com/...)
  keys: {
    p256dh: string; // Public key for encryption
    auth: string; // Auth secret for encryption
  };
  deviceId: string; // 디바이스 고유 ID (브라우저 fingerprint)
  userAgent: string; // User Agent 정보 (디바이스 식별용)
  createdAt: Date | Timestamp; // 구독 생성 시간
  lastUsedAt?: Date | Timestamp; // 마지막 사용 시간 (optional)
}

/**
 * 참가자 정보
 */
export interface Participant {
  id: string; // 문서 ID
  cohortId: string; // 기수 ID
  participationCode?: string; // 참여 코드 (Firebase Storage 경로용)
  name: string; // 참가자 이름
  phoneNumber: string; // 전화번호
  gender?: 'male' | 'female' | 'other'; // 성별
  profileImage?: string; // 프로필 이미지 URL (큰 이미지, 프로필 상세용)
  profileImageCircle?: string; // 원형 프로필 이미지 URL (작은 아바타용)
  faceImage?: string; // 얼굴 확대 이미지 (프로필북 전용)
  profileBookUrl?: string; // 프로필북 URL
  isSuperAdmin?: boolean; // 슈퍼 관리자 (모든 프로필 열람, 리스트 미표시)
  isAdministrator?: boolean; // 일반 관리자 (공지사항 관리, 프로필 열람 제약 동일)
  isGhost?: boolean; // 고스트 참가자 (테스트용, 리스트 미표시, 오늘의 서재 접근 가능)
  occupation?: string; // 직업/하는 일
  bio?: string; // 한 줄 소개 (2줄 이내)
  currentBookTitle?: string; // 현재 읽고 있는 책 제목 (프로필북에 표시)
  currentBookAuthor?: string; // 현재 읽고 있는 책 저자 (자동 채움용)
  currentBookCoverUrl?: string; // 현재 읽고 있는 책 표지 URL (자동 채움용)
  bookHistory?: BookHistoryEntry[]; // 책 읽기 이력 (관리자용)
  firebaseUid: string | null; // 🔄 Firebase Auth UID (Phone Auth 연동용, null 허용 - 첫 로그인 전)
  pushToken?: string; // 푸시 알림 토큰 (FCM) - DEPRECATED: pushTokens 배열 사용 권장
  pushNotificationEnabled?: boolean; // 푸시 알림 활성화 여부 (사용자 설정)
  pushTokenUpdatedAt?: Timestamp; // 푸시 토큰 마지막 갱신 시간 - DEPRECATED: pushTokens[].updatedAt 사용 권장
  pushTokens?: PushTokenEntry[]; // 멀티 디바이스 FCM 푸시 토큰 배열 (Android/Desktop)
  webPushSubscriptions?: WebPushSubscriptionData[]; // 표준 Web Push 구독 배열 (iOS Safari + All)
  lastActivityAt?: Timestamp; // 마지막 활동 시간 (데이터센터용)

  // 🆕 소셜링 투표 정보 (v2)
  socializingVotes?: {
    optionIds?: string[];  // 1차: 선택한 조합 ID 배열 (복수 선택 가능)
    cantAttend?: boolean;  // 1차: 불참 여부 (true면 optionIds 무시)
    attendance?: 'attending' | 'not_attending';  // 2차: 참석 여부
  };

  // 🆕 소셜링 매칭 결과 (Phase 3)
  socializingResult?: {
    cohortId: string;      // 배정된 모임 기수 ID
    optionId: string;      // 확정된 선택지 ID
    date: string;          // 확정된 날짜
    time: string;          // 확정된 시간
    location: string;      // 확정된 장소
  };

  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
}

/**
 * 독서 인증 자료
 */
export interface ReadingSubmission {
  id: string; // 문서 ID
  participantId: string; // 참가자 ID (Participant.id)
  participationCode: string; // 참여 코드
  cohortId?: string; // 기수 ID (중복 참가자 구분용, 2025-11-11 추가)
  bookTitle?: string; // 책 제목 (임시저장 시 선택, 제출 시 필수)
  bookAuthor?: string; // 책 저자 (선택)
  bookCoverUrl?: string; // 책 표지 이미지 URL (네이버 API에서 가져온 표지, 선택)
  bookDescription?: string; // 책 소개글 (네이버 API에서 가져온 설명, 선택)
  bookImageUrl?: string; // 책 사진 (임시저장 시 선택, 제출 시 필수)
  review?: string; // 간단 감상평 (임시저장 시 선택, 제출 시 필수)
  dailyQuestion?: string; // 오늘의 질문 (임시저장 시 선택, 제출 시 필수)
  dailyAnswer?: string; // 오늘의 질문에 대한 답변 (임시저장 시 선택, 제출 시 필수)
  submittedAt?: Timestamp; // 제출 일시 (임시저장 시 null)
  submissionDate?: string; // 제출 날짜 (YYYY-MM-DD 형식, 임시저장 시 선택)
  status: 'draft' | 'pending' | 'approved' | 'rejected'; // draft: 임시저장, approved: 제출 완료
  reviewNote?: string; // ⚠️ DEPRECATED: 검토 메모 (승인 프로세스 제거됨, DB 호환성을 위해 유지)
  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
  metadata?: Record<string, any>; // 추가 메타데이터 (확장 가능)
}

/**
 * 공지 템플릿 카테고리
 */
export type NoticeTemplateCategory = 'onboarding' | 'guide' | 'milestone' | 'event';

/**
 * 공지 템플릿
 * - 재활용 가능한 공지의 마스터 템플릿
 * - datacntr에서 선택하여 기수별 공지로 복사
 */
export interface NoticeTemplate {
  id: string; // 문서 ID (welcome-guide, reading-tips 등)
  category: NoticeTemplateCategory; // 카테고리
  title: string; // 템플릿 제목
  content: string; // 공지 내용
  imageUrl?: string; // 이미지 URL (선택)
  order: number; // 정렬 순서 (같은 카테고리 내)
  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
}

/**
 * 공지사항
 *
 * Note: isPinned 필드는 DB에 남아있을 수 있으나 앱에서는 사용하지 않음 (레거시)
 */
export interface Notice {
  id: string; // 문서 ID
  cohortId: string; // 기수 ID
  author: string; // 작성자
  content: string; // 공지 내용
  title?: string; // 푸시 알림 제목 (선택)
  imageUrl?: string; // 이미지 URL (선택)
  templateId?: string; // 템플릿 ID (템플릿에서 생성된 경우)
  isCustom: boolean; // 커스텀 공지 여부 (true: 직접 작성, false: 템플릿 복사)
  status?: 'draft' | 'published' | 'scheduled'; // 공지 상태 (draft: 임시저장, published: 발행, scheduled: 예약)
  scheduledAt?: Timestamp; // 예약 발행 시간 (선택)
  order?: number; // 정렬 순서 (템플릿에서 복사된 경우)
  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
}

/**
 * 다이렉트 메시지
 */
export interface DirectMessage {
  id: string; // 문서 ID
  conversationId: string; // 대화 ID (userId1-userId2 형식)
  senderId: string; // 발신자 ID
  receiverId: string; // 수신자 ID
  content: string; // 메시지 내용
  imageUrl?: string; // 이미지 URL (선택)
  isRead: boolean; // 읽음 여부
  createdAt: Timestamp; // 생성 일시
}

/**
 * 대화방 정보 (Admin Inquiry Inbox용)
 */
export interface Conversation {
  id: string; // 문서 ID (conversationId)
  participantId: string; // 참가자 ID
  lastMessage: string; // 마지막 메시지 미리보기
  lastMessageAt: Timestamp; // 마지막 메시지 시간
  adminUnreadCount: number; // 관리자가 안 읽은 메시지 수
  userInfo?: {
    name: string;
    profileImage?: string;
    profileImageCircle?: string;
    cohortId?: string;
    cohortName?: string;
  };
}

/**
 * 컬렉션 이름 상수
 */
export const COLLECTIONS = {
  COHORTS: 'cohorts',
  PARTICIPANTS: 'participants',
  READING_SUBMISSIONS: 'reading_submissions',
  NOTICES: 'notices',
  NOTICE_TEMPLATES: 'notice_templates', // 공지 템플릿
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations', // 대화방
  MATCHING_JOBS: 'matching_jobs',
  MEETUP_MESSAGES: 'meetup_messages', // 소셜링 모임 채팅
} as const;

/**
 * 소셜링 모임 채팅 메시지
 * - cohorts/{cohortId}/meetup_messages/{messageId}
 */
export interface MeetupMessage {
  id: string;
  cohortId: string;
  content: string;
  authorId: string; // 작성자 ID
  authorName: string; // 작성자 이름
  authorProfileImage?: string | null; // 작성자 프로필 이미지 (선택)
  createdAt: Timestamp;
  type: 'text' | 'image' | 'system'; // 메시지 타입
  imageUrl?: string | null; // 이미지 메시지인 경우
}

/**
 * AI 매칭 작업 상태 (비동기 처리용)
 */
export type MatchingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MatchingJob {
  id: string; // 문서 ID (UUID)
  status: MatchingJobStatus;
  cohortId: string;
  date: string; // YYYY-MM-DD (매칭 대상 날짜, 어제)
  result: DailyMatchingEntry | null; // 완료 시 결과
  error: string | null; // 실패 시 에러 메시지
  progress?: number; // 진행률 (0-100, 선택적)
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

