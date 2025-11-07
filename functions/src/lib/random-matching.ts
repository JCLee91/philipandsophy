/**
 * 랜덤 프로필북 매칭 시스템
 *
 * AI 분석 대신 랜덤으로 프로필북을 전달하며, 다음 규칙을 따릅니다:
 * 1. 프로필북 개수: 2 × (누적인증 + 1)
 * 2. 성별 균형 우선 (남/여 비율 50:50 목표)
 * 3. 중복 방지: 최근 3일간 받은 사람 제외
 * 4. 본인 제외
 *
 * @version 2.0.0
 * @date 2025-11-07
 */

// Firebase Functions 환경에서는 logger를 직접 사용
const logger = {
  error: (message: string, ...args: any[]) => console.error(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args),
  info: (message: string, ...args: any[]) => console.info(message, ...args),
};

/**
 * 참가자 정보 (누적 인증 횟수 포함)
 */
export interface ParticipantWithSubmissionCount {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  submissionCount: number; // 누적 인증 횟수
}

/**
 * 랜덤 매칭 입력
 */
export interface RandomMatchingInput {
  participants: ParticipantWithSubmissionCount[]; // 어제 인증한 참가자 목록
  recentMatchings?: Record<string, string[]>; // 최근 3일간 매칭 이력 (participantId → 받은 프로필북 ID 배열)
}

/**
 * 랜덤 매칭 결과
 */
export interface RandomMatchingResult {
  assignments: Record<string, {
    assigned: string[]; // 할당된 프로필북 ID 배열
  }>;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * 프로필북 개수 계산
 * 공식: 2 × (누적인증 + 1)
 */
function calculateProfileBookCount(submissionCount: number): number {
  return 2 * (submissionCount + 1);
}

/**
 * Fisher-Yates 셔플 알고리즘 (순수 함수)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 성별별로 참가자 그룹화
 */
function groupByGender(participants: ParticipantWithSubmissionCount[]): {
  male: ParticipantWithSubmissionCount[];
  female: ParticipantWithSubmissionCount[];
  other: ParticipantWithSubmissionCount[];
} {
  const male: ParticipantWithSubmissionCount[] = [];
  const female: ParticipantWithSubmissionCount[] = [];
  const other: ParticipantWithSubmissionCount[] = [];

  participants.forEach(p => {
    if (p.gender === 'male') {
      male.push(p);
    } else if (p.gender === 'female') {
      female.push(p);
    } else {
      other.push(p);
    }
  });

  return { male, female, other };
}

/**
 * 후보 필터링: 본인 제외 + 최근 3일 중복 제외
 */
function filterCandidates(
  allParticipants: ParticipantWithSubmissionCount[],
  currentParticipantId: string,
  recentlyAssignedIds: string[]
): ParticipantWithSubmissionCount[] {
  const recentSet = new Set(recentlyAssignedIds);

  return allParticipants.filter(p =>
    p.id !== currentParticipantId && // 본인 제외
    !recentSet.has(p.id) // 최근 3일간 받은 사람 제외
  );
}

/**
 * 성별 균형 우선 랜덤 선택
 *
 * 로직:
 * 1. 남/여 비율 50:50 목표
 * 2. 불가능 시 성별 무관 랜덤 선택
 */
function selectWithGenderBalance(
  candidates: ParticipantWithSubmissionCount[],
  count: number
): ParticipantWithSubmissionCount[] {
  if (candidates.length === 0 || count === 0) {
    return [];
  }

  // 성별별 그룹화
  const { male, female, other } = groupByGender(candidates);

  // 셔플 (랜덤 순서)
  const shuffledMale = shuffleArray(male);
  const shuffledFemale = shuffleArray(female);
  const shuffledOther = shuffleArray(other);

  const selected: ParticipantWithSubmissionCount[] = [];

  // 성별 균형 목표: count / 2 명씩
  const targetPerGender = Math.floor(count / 2);

  // 1. 남성 선택 (목표: targetPerGender명)
  const maleToSelect = Math.min(targetPerGender, shuffledMale.length);
  selected.push(...shuffledMale.slice(0, maleToSelect));

  // 2. 여성 선택 (목표: targetPerGender명)
  const femaleToSelect = Math.min(targetPerGender, shuffledFemale.length);
  selected.push(...shuffledFemale.slice(0, femaleToSelect));

  // 3. 부족한 경우 나머지 채우기
  const remaining = count - selected.length;
  if (remaining > 0) {
    // 남은 남성, 여성, 기타 성별 모두 합쳐서 랜덤 선택
    const remainingCandidates = [
      ...shuffledMale.slice(maleToSelect),
      ...shuffledFemale.slice(femaleToSelect),
      ...shuffledOther,
    ];
    const shuffledRemaining = shuffleArray(remainingCandidates);
    selected.push(...shuffledRemaining.slice(0, remaining));
  }

  return selected;
}

/**
 * 랜덤 매칭 실행
 *
 * @param input 매칭 입력 (참가자 목록, 최근 매칭 이력)
 * @returns 매칭 결과 (각 참가자별 할당된 프로필북 ID)
 */
export async function matchParticipantsRandomly(
  input: RandomMatchingInput
): Promise<RandomMatchingResult> {
  const { participants, recentMatchings = {} } = input;

  logger.info(`[Random Matching] 시작: ${participants.length}명`);

  const assignments: Record<string, { assigned: string[] }> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // 각 참가자에 대해 프로필북 할당
  for (const participant of participants) {
    const { id, name, submissionCount } = participant;

    // 1. 프로필북 개수 계산
    const profileBookCount = calculateProfileBookCount(submissionCount);

    // 2. 최근 3일간 받은 프로필북 ID 조회
    const recentlyAssigned = recentMatchings[id] || [];

    // 3. 후보 필터링 (본인 + 최근 3일 제외)
    const candidates = filterCandidates(
      participants,
      id,
      recentlyAssigned
    );

    // 4. 성별 균형 우선 랜덤 선택
    const selected = selectWithGenderBalance(candidates, profileBookCount);

    // 5. 할당
    assignments[id] = {
      assigned: selected.map(p => p.id),
    };

    // 6. 검증 로깅
    if (selected.length < profileBookCount) {
      warnings.push(
        `${name}: 요청 ${profileBookCount}개 중 ${selected.length}개만 할당 (후보 부족)`
      );
      logger.warn(
        `[Random Matching] ${name}: 후보 부족 - 요청 ${profileBookCount}개, 할당 ${selected.length}개`
      );
    }

    logger.info(
      `[Random Matching] ${name}: ${selected.length}개 할당 (목표: ${profileBookCount}개, 누적인증: ${submissionCount}회)`
    );
  }

  // 최종 검증
  const validation = {
    valid: errors.length === 0,
    errors,
    warnings,
  };

  logger.info(
    `[Random Matching] 완료: ${Object.keys(assignments).length}명 할당, ` +
    `${errors.length}개 에러, ${warnings.length}개 경고`
  );

  return {
    assignments,
    validation,
  };
}

/**
 * 매칭 결과 검증
 *
 * @param result 매칭 결과
 * @param input 원본 입력
 * @returns 검증 결과
 */
export function validateRandomMatching(
  result: RandomMatchingResult,
  input: RandomMatchingInput
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { participants } = input;
  const { assignments } = result;

  // 1. 모든 참가자가 할당받았는지 확인
  const unassigned = participants.filter(p => !assignments[p.id]);
  if (unassigned.length > 0) {
    errors.push(
      `할당받지 못한 참가자 ${unassigned.length}명: ${unassigned.map(p => p.name).join(', ')}`
    );
  }

  // 2. 각 참가자의 할당 검증
  for (const participant of participants) {
    const assignment = assignments[participant.id];
    if (!assignment) continue;

    const { id, name, submissionCount } = participant;
    const expectedCount = calculateProfileBookCount(submissionCount);
    const actualCount = assignment.assigned.length;

    // 2-1. 본인이 할당되지 않았는지 확인
    if (assignment.assigned.includes(id)) {
      errors.push(`${name}: 본인이 할당되어 있음`);
    }

    // 2-2. 중복 확인
    const uniqueIds = new Set(assignment.assigned);
    if (uniqueIds.size !== actualCount) {
      errors.push(`${name}: 중복된 프로필북 ID 발견`);
    }

    // 2-3. 할당 개수 경고 (부족한 경우)
    if (actualCount < expectedCount) {
      warnings.push(
        `${name}: 기대 ${expectedCount}개, 실제 ${actualCount}개 할당 (후보 부족)`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
