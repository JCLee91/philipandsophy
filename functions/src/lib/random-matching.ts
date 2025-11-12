/**
 * 랜덤 프로필북 매칭 시스템
 *
 * AI 분석 대신 랜덤으로 프로필북을 전달하며, 다음 규칙을 따릅니다:
 * 1. 프로필북 개수: 2 × (누적인증 + 2)
 * 2. 성별 균형 우선 (남/여 비율 50:50 목표)
 * 3. 중복 방지: 어제만 받은 사람 제외 (1일)
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
 * 랜덤 매칭 입력 (공급자/수요자 분리)
 */
export interface RandomMatchingInput {
  providers: ParticipantWithSubmissionCount[]; // 프로필북 공급자 (어제 인증한 참가자)
  viewers: ParticipantWithSubmissionCount[]; // 프로필북 수요자 (전체 cohort 멤버)
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
 * 공식: 2 × (누적인증 + 2)
 */
function calculateProfileBookCount(submissionCount: number): number {
  return 2 * (submissionCount + 2);
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
 * 후보 필터링: 본인 제외 + 어제 중복 제외
 *
 * @param providers 프로필북 공급자 목록 (어제 인증한 사람들)
 * @param currentViewerId 현재 수요자 ID
 * @param recentlyAssignedIds 어제 받은 프로필북 ID
 */
function filterCandidates(
  providers: ParticipantWithSubmissionCount[],
  currentViewerId: string,
  recentlyAssignedIds: string[]
): ParticipantWithSubmissionCount[] {
  const recentSet = new Set(recentlyAssignedIds);

  return providers.filter(p =>
    p.id !== currentViewerId && // 본인 제외
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
 * 미인증 사용자를 위한 맨 앞 2개 성별 균형 보장
 *
 * 미인증 시 맨 앞 2개만 열리므로, 반드시 남1 여1로 배치
 *
 * @param selected 선택된 참가자 배열
 * @returns 맨 앞 2개가 남1 여1로 재배치된 배열
 */
function ensureGenderBalanceAtTop(
  selected: ParticipantWithSubmissionCount[]
): ParticipantWithSubmissionCount[] {
  if (selected.length < 2) {
    return selected;
  }

  // 성별별 그룹화
  const { male, female } = groupByGender(selected);

  if (male.length === 0 || female.length === 0) {
    // 한 쪽 성별이 없으면 그대로 반환
    return selected;
  }

  // 맨 앞 2개: 남성 1명 + 여성 1명
  const topTwo: ParticipantWithSubmissionCount[] = [male[0], female[0]];

  // 나머지 참가자들 (맨 앞 2명 제외)
  const remaining = selected.filter(
    p => p.id !== male[0].id && p.id !== female[0].id
  );

  // 최종 배열: [남1, 여1, ...나머지]
  return [...topTwo, ...remaining];
}

/**
 * 랜덤 매칭 실행
 *
 * @param input 매칭 입력 (공급자/수요자 분리)
 * @returns 매칭 결과 (각 수요자별 할당된 프로필북 ID)
 */
export async function matchParticipantsRandomly(
  input: RandomMatchingInput
): Promise<RandomMatchingResult> {
  const { providers, viewers, recentMatchings = {} } = input;

  logger.info(
    `[Random Matching] 시작: 공급자 ${providers.length}명, 수요자 ${viewers.length}명`
  );

  const assignments: Record<string, { assigned: string[] }> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // 각 수요자(viewer)에 대해 프로필북 할당
  for (const viewer of viewers) {
    const { id, name, submissionCount } = viewer;

    // 1. 프로필북 개수 계산 (누적 인증 기반)
    const profileBookCount = calculateProfileBookCount(submissionCount);

    // 2. 최근 3일간 받은 프로필북 ID 조회
    const recentlyAssigned = recentMatchings[id] || [];

    // 3. 후보 필터링 (본인 + 최근 3일 제외)
    const candidates = filterCandidates(
      providers, // 공급자 목록에서 선택
      id,
      recentlyAssigned
    );

    // 4. 성별 균형 우선 랜덤 선택
    const selected = selectWithGenderBalance(candidates, profileBookCount);

    // 4-1. 미인증 사용자를 위한 맨 앞 2개 성별 균형 보장
    const reordered = ensureGenderBalanceAtTop(selected);

    // 5. 할당
    assignments[id] = {
      assigned: reordered.map(p => p.id),
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

  const { viewers, providers } = input;
  const { assignments } = result;

  // 1. 모든 수요자가 할당받았는지 확인
  const unassigned = viewers.filter(v => !assignments[v.id]);
  if (unassigned.length > 0) {
    errors.push(
      `할당받지 못한 수요자 ${unassigned.length}명: ${unassigned.map(v => v.name).join(', ')}`
    );
  }

  // 2. 각 수요자의 할당 검증
  for (const viewer of viewers) {
    const assignment = assignments[viewer.id];
    if (!assignment) continue;

    const { id, name, submissionCount } = viewer;
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

    // 2-3. 할당된 ID가 모두 공급자 목록에 있는지 확인
    const providerIds = new Set(providers.map(p => p.id));
    const invalidIds = assignment.assigned.filter(aid => !providerIds.has(aid));
    if (invalidIds.length > 0) {
      errors.push(`${name}: 유효하지 않은 프로필북 ID (공급자 목록에 없음): ${invalidIds.join(', ')}`);
    }

    // 2-4. 할당 개수 경고 (부족한 경우)
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
