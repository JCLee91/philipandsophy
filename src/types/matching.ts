/**
 * 관리자 매칭 시스템 공유 타입 정의
 *
 * @description 매칭 알고리즘과 UI 컴포넌트에서 사용하는 타입들
 * @see /src/app/app/admin/matching/page.tsx - 매칭 관리 페이지
 * @see /src/components/admin/ParticipantAssignmentTable.tsx - 매칭 테이블 컴포넌트
 */

/**
 * 매칭 이유 설명
 */
export interface MatchingReasons {
  /** 비슷한 가치관 이유 */
  similar?: string;
  /** 반대 가치관 이유 */
  opposite?: string;
  /** 전체 요약 */
  summary?: string;
}

/**
 * 참가자별 매칭 배정 정보
 */
export interface ParticipantAssignment {
  /** 비슷한 가치관 참가자 ID 목록 */
  similar: string[];
  /** 반대 가치관 참가자 ID 목록 */
  opposite: string[];
  /** 매칭 이유 (선택) */
  reasons?: MatchingReasons | null;
}

/**
 * 매칭 검증 결과
 */
export interface MatchingValidation {
  /** 검증 통과 여부 */
  valid: boolean;
  /** 검증 실패 오류 목록 */
  errors: string[];
}

/**
 * 매칭 API 응답 데이터
 */
export interface MatchingResponse {
  /** 성공 여부 */
  success: boolean;
  /** 제출 날짜 (YYYY-MM-DD) */
  date: string;
  /** 해당 날짜의 질문 */
  question?: string;
  /** 총 참가자 수 */
  totalParticipants?: number;
  /** 매칭 결과 */
  matching: {
    /** 전체 참가자 배정 */
    assignments: Record<string, ParticipantAssignment>;
  };
  /** 매칭 검증 결과 (AI 매칭 품질 체크) */
  validation?: MatchingValidation;
  /** 제출 통계 */
  submissionStats?: {
    submitted: number;
    notSubmitted: number;
    notSubmittedList: Array<{ id: string; name: string }>;
  };
}

/**
 * 매칭 대상자 정보
 */
export interface MatchingTarget {
  /** 참가자 ID */
  id: string;
  /** 참가자 이름 */
  name: string;
}

/**
 * 테이블 표시용 매칭 배정 행
 *
 * @description UI에 표시하기 위해 가공된 데이터 구조
 */
export interface AssignmentRow {
  /** 열람자 (본인) ID */
  viewerId: string;
  /** 열람자 (본인) 이름 */
  viewerName: string;
  /** 비슷한 가치관 대상자 목록 */
  similarTargets: MatchingTarget[];
  /** 반대 가치관 대상자 목록 */
  oppositeTargets: MatchingTarget[];
  /** 매칭 이유 (선택) */
  reasons?: MatchingReasons | null;
}
