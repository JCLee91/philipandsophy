import { format, subDays, parseISO, isValid, isFuture, addDays, isSameDay, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Timestamp } from 'firebase/firestore';
import type { Cohort } from '@/types/database';
import { logger } from './logger';

const KOREA_TIMEZONE = 'Asia/Seoul';

/**
 * 한국 시간(KST) 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 *
 * Vercel 서버는 UTC 타임존을 사용하므로, 명시적으로 한국 시간으로 변환해야 함.
 * 변환하지 않으면 00:00~08:59 KST 사이에 전날 날짜를 반환하여 매칭 실패.
 *
 * @returns 오늘 날짜 문자열 (예: "2025-10-12")
 *
 * @example
 * // Vercel 서버 시간: 2025-10-11 23:00 UTC
 * // 한국 시간: 2025-10-12 08:00 KST
 * getTodayString(); // "2025-10-12" (KST 기준)
 */
export function getTodayString(): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);
  return format(nowKST, 'yyyy-MM-dd');
}

/**
 * 한국 시간(KST) 기준 제출 날짜를 반환 (새벽 2시 마감 정책 적용)
 *
 * 새벽 2시까지는 전날 날짜로 처리합니다.
 * - 00:00~01:59: 전날 날짜 반환
 * - 02:00~23:59: 오늘 날짜 반환
 *
 * @returns 제출 날짜 문자열 (예: "2025-10-15")
 *
 * @example
 * // 10월 16일 새벽 1시 30분
 * getSubmissionDate(); // "2025-10-15" (전날로 처리)
 *
 * // 10월 16일 오전 10시
 * getSubmissionDate(); // "2025-10-16" (오늘로 처리)
 */
export function getSubmissionDate(): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);
  const hour = nowKST.getHours();

  // 새벽 0시~1시 59분: 전날로 처리
  if (hour < 2) {
    const yesterdayKST = subDays(nowKST, 1);
    return format(yesterdayKST, 'yyyy-MM-dd');
  }

  // 새벽 2시~23시 59분: 오늘로 처리
  return format(nowKST, 'yyyy-MM-dd');
}

/**
 * 한국 시간(KST) 기준 매칭용 날짜를 반환 (새벽 2시 마감 정책 적용)
 *
 * 매칭 대상은 항상 "어제" 제출한 사람들입니다.
 * - 0시~1시 59분: 어제 날짜 (어제는 아직 진행 중이지만 매칭 대상)
 * - 2시~23시 59분: 어제 날짜 (어제가 마감되어 매칭 대상)
 *
 * @returns 매칭 대상 날짜 문자열 (항상 어제 날짜)
 *
 * @example
 * // 10월 16일 새벽 1시
 * getMatchingTargetDate(); // "2025-10-15" (어제)
 *
 * // 10월 16일 오전 10시
 * getMatchingTargetDate(); // "2025-10-15" (어제)
 */
export function getMatchingTargetDate(): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);

  // 항상 어제 날짜 반환
  // 0-2시: 어제는 아직 진행 중이지만 프로필북은 계속 볼 수 있어야 함
  // 2시 이후: 어제가 마감되어 정식으로 매칭 대상
  const yesterdayKST = subDays(nowKST, 1);
  return format(yesterdayKST, 'yyyy-MM-dd');
}

/**
 * 한국 시간(KST) 기준 어제 날짜를 YYYY-MM-DD 형식으로 반환
 *
 * 프로필북 매칭은 어제 제출된 독서 인증을 기반으로 실행됩니다.
 * 이 함수는 매칭 시스템 전용으로 사용됩니다.
 *
 * @returns 어제 날짜 문자열 (예: "2025-10-11")
 *
 * @example
 * // 한국 시간: 2025-10-12 10:00 KST
 * getYesterdayString(); // "2025-10-11" (KST 기준 어제)
 *
 * @see getTodayString - 오늘 날짜 조회
 */
export function getYesterdayString(): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);
  const yesterdayKST = subDays(nowKST, 1);
  return format(yesterdayKST, 'yyyy-MM-dd');
}

/**
 * 주어진 날짜에서 하루를 뺀 날짜를 반환 (YYYY-MM-DD 형식)
 *
 * 프로필북 표시 규칙: "어제 답변 → 오늘 공개"
 * - 10월 17일 매칭 → 10월 16일까지의 인증만 표시
 * - 10월 18일 매칭 → 10월 17일까지의 인증만 표시
 *
 * @param dateString - ISO 날짜 문자열 (YYYY-MM-DD)
 * @returns 하루 전 날짜 문자열 (YYYY-MM-DD)
 *
 * @example
 * getPreviousDayString('2025-10-17'); // "2025-10-16"
 * getPreviousDayString('2025-10-18'); // "2025-10-17"
 */
export function getPreviousDayString(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) {

    return dateString; // Fallback to original if invalid
  }
  const previousDay = subDays(date, 1);
  return format(previousDay, 'yyyy-MM-dd');
}

/**
 * Firebase 제출물을 cutoff 날짜 기준으로 필터링 (KST 타임존 처리)
 *
 * 날짜 형식 검증, 미래 날짜 방지, 타임존 변환을 수행합니다.
 * 프로필북 매칭 시스템에서 스포일러 방지를 위해 사용됩니다.
 *
 * @template T - submittedAt 필드를 가진 제출물 타입
 * @param submissions - 필터링할 제출물 배열
 * @param cutoffDate - ISO 날짜 문자열 (YYYY-MM-DD) 또는 null (필터링 안 함)
 * @returns cutoff 날짜까지의 제출물 (다음날 새벽 01:59:59.999 KST 포함)
 *
 * @example
 * const filtered = filterSubmissionsByDate(allSubmissions, '2025-10-11');
 * // Returns: 2025-10-12 01:59:59.999 KST 이전 제출물 (다음날 새벽 2시까지)
 *
 * @example
 * const all = filterSubmissionsByDate(allSubmissions, null);
 * // Returns: 모든 제출물 (필터링 안 함)
 */
export function filterSubmissionsByDate<T extends { id?: string; submittedAt: Timestamp }>(
  submissions: T[],
  cutoffDate: string | null
): T[] {
  // cutoffDate가 없으면 필터링 안 함
  if (!cutoffDate) return submissions;

  // 빈 배열이면 즉시 반환 (성능 최적화)
  if (submissions.length === 0) return submissions;

  // 입력 검증: 날짜 형식 확인
  const parsedDate = parseISO(cutoffDate);
  if (!isValid(parsedDate)) {

    return submissions; // 잘못된 형식이면 필터링 안 함
  }

  // 미래 날짜 방지 (스포일러 방지)
  if (isFuture(parsedDate)) {

    return submissions; // 미래 날짜면 필터링 안 함
  }

  // KST 기준 cutoff 날짜 설정 (다음날 새벽 2시까지 포함)
  // 정책 변경: 밤 12시 → 새벽 2시 마감
  const nextDay = addDays(parseISO(cutoffDate), 1);
  const cutoffDateKST = toZonedTime(`${format(nextDay, 'yyyy-MM-dd')}T01:59:59.999`, KOREA_TIMEZONE);

  return submissions.filter(sub => {
    // Null/undefined timestamp 체크
    if (!sub.submittedAt) {

      return false;
    }

    const submissionDate = sub.submittedAt.toDate();
    const submissionKST = toZonedTime(submissionDate, KOREA_TIMEZONE);
    return submissionKST <= cutoffDateKST;
  });
}

/**
 * 제출 날짜 기준으로 접근 가능한 프로필북 공개 날짜집을 계산합니다.
 *
 * 새벽 2시 마감 정책:
 * - 오늘 인증 → 오늘 프로필북만 접근 가능 (제출일과 동일)
 * - 어제 인증 → 새벽 2시까지는 어제 프로필북, 새벽 2시 이후는 접근 불가
 * - 중요: 과거 프로필북은 접근 불가 (오늘 날짜만 반환)
 *
 * @param submissionDates - 제출 날짜 컬렉션 (Set 또는 Array)
 * @returns 공개일 집합 (오늘만 포함, 과거는 제외)
 *
 * @example
 * // 10월 29일 인증 → 10월 30일 새벽 1시: today="2025-10-29" → ["2025-10-29"]
 * // 10월 29일 인증 → 10월 30일 오후 1시: today="2025-10-30" → [] (AI 분석 중)
 * // 10월 30일 인증 → 10월 30일 오후 4시: today="2025-10-30" → ["2025-10-30"]
 */
export function getMatchingAccessDates(submissionDates: Iterable<string>): Set<string> {
  const today = getSubmissionDate(); // 새벽 2시 마감 정책 적용
  const accessDates = new Set<string>();

  for (const rawDate of submissionDates) {
    if (!rawDate) continue;

    const parsed = parseISO(rawDate);
    if (!isValid(parsed)) {
      continue;
    }

    const submissionDateString = format(parsed, 'yyyy-MM-dd');

    // ✅ FIX: 오늘 제출한 경우만 접근 허용 (새벽 2시 기준)
    // - 10월 29일 23:00 인증 → 10월 30일 01:00: today="2025-10-29" → 접근 O
    // - 10월 29일 23:00 인증 → 10월 30일 02:00 이후: today="2025-10-30" → 접근 X (빈 Set 반환)
    if (submissionDateString === today) {
      accessDates.add(today);
      break; // 오늘 날짜만 추가하고 종료
    }
  }

  return accessDates;
}

/**
 * 오늘이 프로그램 마지막 날인지 체크
 *
 * @param cohort - 기수 정보
 * @returns true if 오늘 = endDate (KST 기준)
 */
export function isFinalDay(cohort: Cohort): boolean {
  if (!cohort?.endDate) return false;

  const today = getTodayString();
  return today === cohort.endDate;
}

/**
 * 프로그램 종료 후인지 체크
 *
 * @param cohort - 기수 정보
 * @returns true if 오늘 > endDate
 */
export function isAfterProgram(cohort: Cohort): boolean {
  if (!cohort?.endDate) return false;

  const today = parseISO(getTodayString());
  const endDate = parseISO(cohort.endDate);

  return isAfter(today, endDate);
}

/**
 * 전체 프로필을 공개할 수 있는 날인지 체크
 * (마지막 날부터 무제한)
 *
 * @param cohort - 기수 정보
 * @returns true if 전체 공개 가능 (마지막 날 이후 계속)
 */
export function canViewAllProfiles(cohort: Cohort): boolean {
  if (!cohort?.endDate) return false;

  const today = parseISO(getTodayString());
  const endDate = parseISO(cohort.endDate);

  // 14일차 (마지막 날)부터 무제한
  return today >= endDate;
}

/**
 * 인증 없이도 전체 프로필을 볼 수 있는 날인지 체크
 * (15일차부터 무제한, 즉 프로그램 종료 다음날부터 계속)
 *
 * @param cohort - 기수 정보
 * @returns true if 인증 없이 전체 공개 가능 (endDate + 1일 이후 계속)
 */
export function canViewAllProfilesWithoutAuth(cohort: Cohort): boolean {
  if (!cohort?.endDate) return false;

  const today = parseISO(getTodayString());
  const endDate = parseISO(cohort.endDate);

  // 15일차 (마지막 날 + 1일)부터 무제한
  const startDate = addDays(endDate, 1);

  return today >= startDate;
}

/**
 * 어제 인증자 전체 공개 모드인지 체크
 *
 * @param cohort - 기수 정보
 * @returns true if profileUnlockDate 설정되어 있고 오늘이 해당 날짜 이상
 *
 * @example
 * // profileUnlockDate: "2025-10-08", today: "2025-10-10"
 * shouldShowAllYesterdayVerified(cohort); // true
 *
 * // profileUnlockDate: "2025-10-08", today: "2025-10-07"
 * shouldShowAllYesterdayVerified(cohort); // false
 */
export function shouldShowAllYesterdayVerified(cohort: Cohort): boolean {
  if (!cohort?.profileUnlockDate) return false;

  const today = parseISO(getTodayString());
  const unlockDate = parseISO(cohort.profileUnlockDate);

  if (!isValid(today) || !isValid(unlockDate)) return false;

  // 오늘이 설정된 날짜 이상이면 true
  return today >= unlockDate;
}
