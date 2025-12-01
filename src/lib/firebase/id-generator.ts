'use client';

import { format } from 'date-fns';

/**
 * Firestore 문서 커스텀 ID 생성 유틸리티
 *
 * 각 컬렉션별로 의미 있는 ID를 생성하여 Firestore 콘솔에서 구분하기 쉽게 함
 */

/**
 * 이름에서 성 제외 (예: "문준영" → "준영", "이은지" → "은지")
 * 2글자 이하면 그대로 반환
 */
function extractFirstName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(1);
}

/**
 * Firestore ID에 사용할 수 없는 특수문자 제거
 * 허용: 알파벳, 숫자, 한글, 하이픈, 언더스코어
 */
function sanitizeForFirestoreId(str: string): string {
  return str.replace(/[\/\\?%*:|"<>\s]/g, '');
}

/**
 * 참가자 기본 ID 생성
 * 형식: cohort{기수}-{이름(성 제외)}
 * 예: cohort4-은지, cohort6-종찬
 */
export function generateParticipantId(cohortId: string, name: string): string {
  const firstName = extractFirstName(name);
  const safeName = sanitizeForFirestoreId(firstName);
  return `cohort${cohortId}-${safeName}`;
}

/**
 * 동명이인 처리를 포함한 참가자 ID 생성
 * 동일 cohort 내 같은 이름이 있으면 숫자 suffix 추가
 * 예: cohort4-은지, cohort4-은지2, cohort4-은지3
 */
export function generateUniqueParticipantId(
  cohortId: string,
  name: string,
  existingIds: string[]
): string {
  const baseId = generateParticipantId(cohortId, name);

  if (!existingIds.includes(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.includes(`${baseId}${suffix}`)) {
    suffix++;
  }
  return `${baseId}${suffix}`;
}

/**
 * 공지 ID 생성
 * 형식: notice_{cohortId}_{MMDD}_{HHmm}
 * 예: notice_4_1201_1430
 */
export function generateNoticeId(cohortId: string): string {
  const now = new Date();
  const dateStr = format(now, 'MMdd');
  const timeStr = format(now, 'HHmm');
  return `notice_${cohortId}_${dateStr}_${timeStr}`;
}

/**
 * 동일 시간 중복 방지를 위한 고유 공지 ID 생성
 */
export function generateUniqueNoticeId(
  cohortId: string,
  existingIds: string[]
): string {
  const baseId = generateNoticeId(cohortId);

  if (!existingIds.includes(baseId)) {
    return baseId;
  }

  // 같은 분에 여러 개 생성 시 순번 추가
  let suffix = 2;
  while (existingIds.includes(`${baseId}_${suffix}`)) {
    suffix++;
  }
  return `${baseId}_${suffix}`;
}

/**
 * 메시지 ID 생성
 * 형식: msg_{senderId}_{MMDD}_{HHmmss}
 * 예: msg_cohort4-은지_1201_143025, msg_admin_1201_143025
 */
export function generateMessageId(senderId: string): string {
  const now = new Date();
  const safeId = sanitizeForFirestoreId(senderId);
  const dateStr = format(now, 'MMdd');
  const timeStr = format(now, 'HHmmss'); // 초까지 포함하여 중복 방지
  return `msg_${safeId}_${dateStr}_${timeStr}`;
}

/**
 * 퍼널 이벤트 ID 생성
 * 형식: {stepId}_{timestamp}
 * 예: onboarding_step_1_1733145600000
 */
export function generateFunnelEventId(stepId: string): string {
  return `${stepId}_${Date.now()}`;
}
