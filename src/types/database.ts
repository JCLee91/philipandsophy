import { Timestamp } from 'firebase/firestore';

/**
 * Database Types for Firestore Collections
 */

/**
 * 기수 정보
 */
export interface Cohort {
  id: string; // 문서 ID
  name: string; // 기수 이름 (예: '1기')
  startDate: string; // 시작일 (ISO 8601)
  endDate: string; // 종료일 (ISO 8601)
  isActive: boolean; // 활성화 여부
  dailyFeaturedParticipants?: Record<string, { similar: string[]; opposite: string[] }>; // 날짜별 추천 참가자 (예: { "2025-01-15": { similar: ["id1", "id2"], opposite: ["id3", "id4"] } })
  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
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
 * 참가자 정보
 */
export interface Participant {
  id: string; // 문서 ID
  cohortId: string; // 기수 ID
  name: string; // 참가자 이름
  phoneNumber: string; // 전화번호
  profileImage?: string; // 프로필 이미지 URL
  profileBookUrl?: string; // 프로필북 URL
  isAdmin?: boolean; // 운영자 여부
  occupation?: string; // 직업/하는 일
  bio?: string; // 한 줄 소개 (2줄 이내)
  currentBookTitle?: string; // 현재 읽고 있는 책 제목 (프로필북에 표시)
  bookHistory?: BookHistoryEntry[]; // 책 읽기 이력 (관리자용)
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
  bookTitle: string; // 책 제목 (필수)
  bookAuthor?: string; // 책 저자 (선택)
  bookCoverUrl?: string; // 책 표지 이미지 URL (네이버 API에서 가져온 표지, 선택)
  bookImageUrl: string; // 책 사진 (사용자가 찍은 인증 사진, 필수)
  review: string; // 간단 감상평 (필수)
  dailyQuestion: string; // 오늘의 질문 (필수)
  dailyAnswer: string; // 오늘의 질문에 대한 답변 (필수)
  submittedAt: Timestamp; // 제출 일시
  submissionDate: string; // 제출 날짜 (YYYY-MM-DD 형식, 날짜 비교용)
  status: 'pending' | 'approved' | 'rejected'; // 승인 상태
  reviewNote?: string; // 검토 메모
  createdAt: Timestamp; // 생성 일시
  updatedAt: Timestamp; // 수정 일시
  metadata?: Record<string, any>; // 추가 메타데이터 (확장 가능)
}

/**
 * 공지사항
 */
export interface Notice {
  id: string; // 문서 ID
  cohortId: string; // 기수 ID
  author: string; // 작성자
  content: string; // 공지 내용
  imageUrl?: string; // 이미지 URL (선택)
  isPinned?: boolean; // 상단 고정 여부
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
 * 컬렉션 이름 상수
 */
export const COLLECTIONS = {
  COHORTS: 'cohorts',
  PARTICIPANTS: 'participants',
  READING_SUBMISSIONS: 'reading_submissions',
  NOTICES: 'notices',
  MESSAGES: 'messages',
} as const;

/**
 * 타입 가드 함수들
 */
export function isParticipant(data: any): data is Participant {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.cohortId === 'string' &&
    typeof data.name === 'string' &&
    typeof data.phoneNumber === 'string'
  );
}

export function isReadingSubmission(data: any): data is ReadingSubmission {
  return (
    data &&
    typeof data.participantId === 'string' &&
    typeof data.participationCode === 'string' &&
    ['pending', 'approved', 'rejected'].includes(data.status)
  );
}
