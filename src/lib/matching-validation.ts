import { MATCHING_CONFIG } from '@/constants/matching';

/**
 * 참가자 성별 분포 검증
 *
 * 매칭 전에 입력 참가자들의 성별 데이터 유효성 및 분포를 검증합니다.
 */
export interface ParticipantWithGender {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
}

export interface GenderDistributionResult {
  valid: boolean;
  missingGender: ParticipantWithGender[];
  maleCount: number;
  femaleCount: number;
  requiredPerGender: number;
  errors: string[];
}

/**
 * 참가자들의 성별 데이터 및 분포 검증
 *
 * @param participants - 성별 정보를 포함한 참가자 목록
 * @returns 검증 결과 (valid, 성별별 카운트, 에러 메시지)
 */
export function validateParticipantGenderDistribution(
  participants: ParticipantWithGender[]
): GenderDistributionResult {
  const errors: string[] = [];

  // 1. 성별 데이터 누락 확인
  const withoutGender = participants.filter((p) => !p.gender);

  if (withoutGender.length > 0) {
    errors.push(
      `${withoutGender.length}명의 참가자에게 성별 정보가 없습니다. 성별 정보는 AI 매칭에 필수입니다.`
    );
  }

  // 2. 성별 분포 확인
  const males = participants.filter((p) => p.gender === 'male');
  const females = participants.filter((p) => p.gender === 'female');

  if (
    males.length < MATCHING_CONFIG.MIN_PER_GENDER ||
    females.length < MATCHING_CONFIG.MIN_PER_GENDER
  ) {
    errors.push(
      `성별 균형 매칭을 위한 참가자가 부족합니다. 각 성별당 최소 ${MATCHING_CONFIG.MIN_PER_GENDER}명이 필요합니다. (현재: 남성 ${males.length}명, 여성 ${females.length}명)`
    );
  }

  return {
    valid: errors.length === 0,
    missingGender: withoutGender,
    maleCount: males.length,
    femaleCount: females.length,
    requiredPerGender: MATCHING_CONFIG.MIN_PER_GENDER,
    errors,
  };
}

/**
 * 매칭 결과의 성별 균형 검증
 *
 * AI 매칭 결과에서 모든 추천 쌍이 1남+1여로 구성되었는지 검증합니다.
 */
export interface MatchingAssignment {
  similar: string[];
  opposite: string[];
}

export interface MatchingResult {
  assignments: Record<string, MatchingAssignment>;
}

export interface GenderBalanceResult {
  valid: boolean;
  errors: string[];
}

/**
 * 2명의 추천이 1남 + 1여로 구성되어 있는지 확인
 */
function hasGenderBalance(
  ids: string[],
  genderMap: Map<string, 'male' | 'female' | 'other' | undefined>
): boolean {
  if (ids.length !== 2) return false;

  const genders = ids
    .map((id) => genderMap.get(id))
    .filter((g): g is 'male' | 'female' => g === 'male' || g === 'female');

  if (genders.length !== 2) return false;

  const maleCount = genders.filter((g) => g === 'male').length;
  const femaleCount = genders.filter((g) => g === 'female').length;

  return maleCount === 1 && femaleCount === 1;
}

/**
 * AI 매칭 결과의 성별 균형 검증
 *
 * @param matching - AI 매칭 결과 (assignments)
 * @param participants - 참가자 목록 (성별 정보 포함)
 * @returns 검증 결과 (valid, errors)
 */
export function validateMatchingGenderBalance(
  matching: MatchingResult,
  participants: ParticipantWithGender[]
): GenderBalanceResult {
  const errors: string[] = [];
  const genderMap = new Map(participants.map((p) => [p.id, p.gender]));

  // 모든 참가자의 assignments 검증
  for (const [participantId, assignment] of Object.entries(matching.assignments)) {
    if (!hasGenderBalance(assignment.similar, genderMap)) {
      const participant = participants.find((p) => p.id === participantId);
      errors.push(
        `${participant?.name || participantId}의 similar 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.`
      );
    }

    if (!hasGenderBalance(assignment.opposite, genderMap)) {
      const participant = participants.find((p) => p.id === participantId);
      errors.push(
        `${participant?.name || participantId}의 opposite 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
