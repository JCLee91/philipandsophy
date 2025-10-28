import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { logger } from './logger';
import { MATCHING_CONFIG } from '@/constants/matching';
import type { DailyMatchingReasons, DailyParticipantAssignment } from '@/types/database';
import { z } from 'zod';

// 환경 변수로 모델 선택
function getAIModel() {
  const provider = process.env.AI_PROVIDER || 'openai'; // 기본값: openai
  const modelName = process.env.AI_MODEL || 'gpt-4o-mini'; // 기본값: gpt-4o-mini

  switch (provider) {
    case 'anthropic':
      return anthropic(modelName);
    case 'google':
      return google(modelName);
    case 'openai':
    default:
      return openai(modelName);
  }
}

export interface ParticipantAnswer {
  id: string;
  name: string;
  answer: string;
  gender?: 'male' | 'female' | 'other';
}

export interface MatchingResult {
  assignments: Record<string, DailyParticipantAssignment>;
}

// Zod 스키마 정의 (Vercel AI SDK용)
const matchingReasonsSchema = z.object({
  similar: z.string(),
  opposite: z.string(),
  summary: z.string().optional(),
});

const participantAssignmentSchema = z.object({
  similar: z.array(z.string()),
  opposite: z.array(z.string()),
  reasons: matchingReasonsSchema,
});

// Gemini를 위해 더 명시적인 스키마 정의
const matchingResponseSchema = z.object({
  assignments: z.record(z.string(), participantAssignmentSchema),
});

// 타입 추론
type RawMatchingReasons = z.infer<typeof matchingReasonsSchema>;
type RawParticipantAssignment = z.infer<typeof participantAssignmentSchema>;
type RawMatchingResponse = z.infer<typeof matchingResponseSchema>;

const DEFAULT_REASON_PLACEHOLDER = '사유가 제공되지 않았습니다.';

/**
 * 매칭 이유 정규화 함수 (Vercel AI SDK 버전)
 * Zod 스키마로 이미 타입이 검증되어 있으므로 간단한 fallback만 처리
 */
function normalizeReasons(reasons: RawMatchingReasons): DailyMatchingReasons {
  const result: DailyMatchingReasons = {
    similar: reasons.similar?.trim() || DEFAULT_REASON_PLACEHOLDER,
    opposite: reasons.opposite?.trim() || DEFAULT_REASON_PLACEHOLDER,
  };

  // summary는 선택적
  if (reasons.summary?.trim()) {
    result.summary = reasons.summary.trim();
  }

  return result;
}

/**
 * ID 목록 정규화 함수 (Vercel AI SDK 버전)
 * Zod 스키마로 이미 string[]이 보장되므로 검증 로직 단순화
 */
function normalizeIds(
  ids: string[],
  validIds: Set<string>,
  excludeId?: string
): string[] {
  const unique = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    if (!validIds.has(id)) return;
    if (excludeId && id === excludeId) return;
    if (unique.has(id)) return;
    unique.add(id);
    result.push(id);
  });

  return result;
}

/**
 * 성별 균형 검증: 2명의 추천이 1남 + 1여로 구성되어 있는지 확인
 */
function hasGenderBalance(
  ids: string[],
  genderMap: Map<string, 'male' | 'female' | 'other' | undefined>
): boolean {
  if (ids.length !== 2) return false;

  const genders = ids
    .map(id => genderMap.get(id))
    .filter((g): g is 'male' | 'female' => g === 'male' || g === 'female');

  if (genders.length !== 2) return false;

  const maleCount = genders.filter(g => g === 'male').length;
  const femaleCount = genders.filter(g => g === 'female').length;

  return maleCount === 1 && femaleCount === 1;
}

/**
 * 매칭 검증 함수 (강화 버전)
 * 1. 모든 참가자가 추천받았는지 확인
 * 2. 각 참가자가 정확히 4명을 추천받았는지 확인 (2 similar + 2 opposite)
 * 3. 성별 균형 (1남 + 1여) 확인
 */
function validateMatching(
  matching: MatchingResult,
  participants: ParticipantAnswer[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const recommendationCounts = new Map<string, number>();
  const genderMap = new Map(participants.map(p => [p.id, p.gender]));

  // 1. 모든 추천 카운트
  for (const assignment of Object.values(matching.assignments)) {
    [...assignment.similar, ...assignment.opposite].forEach(id =>
      recommendationCounts.set(id, (recommendationCounts.get(id) || 0) + 1)
    );
  }

  // 2. 추천을 받지 못한 참가자 찾기 (치명적 오류)
  const unrecommended = participants.filter(p => !recommendationCounts.has(p.id));
  if (unrecommended.length > 0) {
    errors.push(`추천받지 못한 참가자 ${unrecommended.length}명: ${unrecommended.map(p => p.name).join(', ')}`);
  }

  // 3. 각 참가자의 추천 검증
  for (const [participantId, assignment] of Object.entries(matching.assignments)) {
    const participant = participants.find(p => p.id === participantId);
    const name = participant?.name || participantId;

    // 3-1. 정확히 2명씩 추천했는지 확인
    if (assignment.similar.length !== 2) {
      errors.push(`${name}의 similar 추천이 ${assignment.similar.length}명입니다. (2명이어야 함)`);
    }
    if (assignment.opposite.length !== 2) {
      errors.push(`${name}의 opposite 추천이 ${assignment.opposite.length}명입니다. (2명이어야 함)`);
    }

    // 3-2. 성별 균형 확인 (1남 + 1여)
    if (!hasGenderBalance(assignment.similar, genderMap)) {
      errors.push(`${name}의 similar 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.`);
    }
    if (!hasGenderBalance(assignment.opposite, genderMap)) {
      errors.push(`${name}의 opposite 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.`);
    }

    // 3-3. 자기 자신 제외 확인
    if (assignment.similar.includes(participantId)) {
      errors.push(`${name}의 similar 추천에 자기 자신이 포함되어 있습니다.`);
    }
    if (assignment.opposite.includes(participantId)) {
      errors.push(`${name}의 opposite 추천에 자기 자신이 포함되어 있습니다.`);
    }
  }

  // 4. 통계 정보 로깅
  if (errors.length === 0) {
    const avgRecommendations = (
      Array.from(recommendationCounts.values()).reduce((a, b) => a + b, 0) /
      recommendationCounts.size
    ).toFixed(1);

    logger.info('✅ 매칭 검증 성공', {
      totalParticipants: participants.length,
      avgRecommendations,
      message: '모든 검증 통과: 4명 추천, 성별 균형, 자기 제외',
    });
  } else {
    logger.error('❌ 매칭 검증 실패', {
      errorCount: errors.length,
      errors: errors.slice(0, 5), // 처음 5개만 로깅
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


/**
 * 사전 검증: 성별 균형 매칭이 가능한지 확인
 * - 각 성별당 최소 2명 필요 (자기 자신 제외하고 1명 추천 가능)
 * - 성별 정보가 없는 참가자 확인
 */
function validateGenderDistribution(participants: ParticipantAnswer[]): {
  valid: boolean;
  errors: string[];
  stats: {
    male: number;
    female: number;
    other: number;
    unknown: number;
  };
} {
  const errors: string[] = [];
  const stats = {
    male: 0,
    female: 0,
    other: 0,
    unknown: 0,
  };

  // 성별 카운트
  participants.forEach(p => {
    if (!p.gender) {
      stats.unknown++;
    } else if (p.gender === 'male') {
      stats.male++;
    } else if (p.gender === 'female') {
      stats.female++;
    } else {
      stats.other++;
    }
  });

  // 성별 정보 누락 확인
  if (stats.unknown > 0) {
    const unknownParticipants = participants
      .filter(p => !p.gender)
      .map(p => p.name);
    errors.push(`성별 정보 누락 ${stats.unknown}명: ${unknownParticipants.join(', ')}`);
  }

  // 최소 인원 확인 (각 성별 최소 2명)
  if (stats.male < 2) {
    errors.push(`남성 참가자가 ${stats.male}명입니다. 최소 2명 필요합니다.`);
  }
  if (stats.female < 2) {
    errors.push(`여성 참가자가 ${stats.female}명입니다. 최소 2명 필요합니다.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    stats,
  };
}

/**
 * OpenAI를 사용하여 일일 질문에 대한 참가자들의 답변을 분석하고
 * 모든 참가자별 추천 프로필북 목록을 생성합니다.
 * (내부 구현 - retry 로직 없음)
 */
async function _matchParticipantsByAI(
  question: string,
  participants: ParticipantAnswer[]
): Promise<MatchingResult> {
  if (participants.length < 4) {
    throw new Error('최소 4명의 참가자가 필요합니다.');
  }

  // 성별 분포 사전 검증
  const genderValidation = validateGenderDistribution(participants);
  if (!genderValidation.valid) {
    logger.error('❌ 성별 분포 사전 검증 실패', {
      errors: genderValidation.errors,
      stats: genderValidation.stats,
    });
    throw new Error(`성별 균형 매칭 불가: ${genderValidation.errors.join('; ')}`);
  }

  logger.info('✅ 성별 분포 사전 검증 통과', {
    stats: genderValidation.stats,
    totalParticipants: participants.length,
  });

  try {
    const participantPromptList = participants
      .map((p, i) => {
        const genderLabel = p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '기타';
        return `${i + 1}. ${p.name} (ID: ${p.id}, 성별: ${genderLabel}): "${p.answer}"`;
      })
      .join('\n');

    const prompt = `
독서 모임 참가자 매칭 과제입니다.

질문: ${question}

참가자 목록 (총 ${participants.length}명):
${participantPromptList}

========================================
추천 기준:
========================================

**비슷한 가치관**: 답변의 핵심 메시지, 가치관, 생각의 방향성이 유사한 사람
- 같은 결론이나 관점을 공유하는 경우
- 비슷한 경험이나 배경을 가진 경우
- 서로 공감하고 깊이 있는 대화를 나눌 수 있는 사람

**상반된 가치관**: 답변의 관점, 접근 방식, 결론이 대조적인 사람
- 정반대의 의견이나 가치관을 가진 경우
- 다른 각도에서 생각하는 경우
- 새로운 시각을 제공하고 토론을 자극할 수 있는 사람

========================================
핵심 규칙 (반드시 준수):
========================================

1. 🎯 모든 ${participants.length}명이 최소 1번 이상 추천받아야 함 (0명 추천받는 사람 금지)

2. 각 참가자마다:
   - 비슷한 가치관 2명 추천 (남성 1명 + 여성 1명)
   - 상반된 가치관 2명 추천 (남성 1명 + 여성 1명)
   - 본인 제외, 중복 불가

3. 다양성 보장:
   - 특정인이 과도하게 많이 추천받지 않도록 균등하게 분산
   - 각 참가자에게 고유한 매칭 제공
   - 추천 횟수를 공평하게 분배

========================================
매칭 이유 작성 가이드 (중요!):
========================================

**좋은 매칭 이유 예시 ✅**
- "당신처럼 안정보다 성장을 우선하는 삶의 태도가 인상적이에요"
- "일과 삶의 균형을 중시하는 점에서 서로 깊이 공감할 것 같아요"
- "당신과 달리 경제적 보상을 가장 중요하게 생각하는 현실주의적 관점이에요"
- "자아실현과 사회적 기여 중 무엇을 우선하는지에서 흥미로운 대조를 이뤄요"

**나쁜 매칭 이유 예시 ❌**
- "비슷한 생각을 가지고 있어요" (너무 추상적)
- "두 분 모두 성장을 중요하게 여기네요" (진부함)
- "답변이 길어요" (피상적)
- "같은 가치관이에요" (모호함)

**작성 규칙:**
1. 구체적인 가치관이나 태도를 언급할 것 (예: "안정", "성장", "워라밸", "도전")
2. "당신처럼" 또는 "당신과 달리"로 시작하여 비교 명확히 할 것
3. 20-35자 길이 (너무 짧거나 길지 않게)
4. 진부한 표현 금지 ("~네요", "~인 것 같아요", "비슷해요")
5. 답변의 핵심 메시지에서 추출할 것 (표면적 특징 X)

========================================
응답 형식 (JSON만):
========================================

{
  "assignments": {
    "참가자ID1": {
      "similar": ["idA", "idB"],
      "opposite": ["idC", "idD"],
      "reasons": {
        "similar": "당신처럼 [구체적 가치관]을 우선하는 [태도/관점]이 인상적이에요",
        "opposite": "당신과 달리 [대조적 가치관]을 중시하는 [차별화된 관점]이에요"
      }
    },
    "참가자ID2": { ... },
    ... (모든 ${participants.length}명 포함)
  }
}

⚠️ 검증 체크리스트:
☑ assignments에 ${participants.length}개 키 모두 있는가?
☑ 모든 참가자가 최소 1번 이상 추천받았는가?
☑ 성별 균형 (남1+여1) 지켜졌는가?
☑ 본인 자신은 제외했는가?
☑ 매칭 이유가 구체적이고 의미 있는가? (진부한 표현 금지)

JSON만 반환하세요.
`;

    const model = getAIModel();
    const provider = process.env.AI_PROVIDER || 'openai';
    const modelName = process.env.AI_MODEL || 'gpt-4o-mini';

    logger.info('🤖 AI API 호출 시작 (Vercel AI SDK)', {
      provider,
      model: modelName,
      participantCount: participants.length,
      promptLength: prompt.length,
    });

    const apiStartTime = Date.now();

    // Google Gemini를 위한 설정 (z.record 미지원 대응)
    const isGoogleProvider = (process.env.AI_PROVIDER || 'openai') === 'google';

    const { object: raw } = await generateObject({
      model,
      schema: matchingResponseSchema,
      system: '당신은 독서 모임 매칭 전문가입니다. 모든 참가자에게 개별적으로 분석한 고유한 추천을 제공하세요. 규칙을 정확히 따르고 JSON만 반환하세요.',
      prompt,
      // Google Gemini는 z.record를 지원하지 않으므로 structuredOutputs 비활성화
      ...(isGoogleProvider && {
        experimental_providerOptions: {
          google: {
            structuredOutputs: false,
          },
        },
      }),
    });
    const apiDuration = Date.now() - apiStartTime;

    logger.info('✅ AI API 응답 완료', {
      provider,
      model: modelName,
      duration: `${(apiDuration / 1000).toFixed(1)}초`,
    });
    const validIds = new Set(participants.map((p) => p.id));

    if (!raw.assignments) {
      throw new Error('AI 응답에 assignments 정보가 없습니다.');
    }

    const assignments: Record<string, DailyParticipantAssignment> = {};
    const missingAssignments: string[] = [];

    for (const participant of participants) {
      const entry = raw.assignments[participant.id];
      
      if (!entry) {
        missingAssignments.push(participant.name);
        logger.error(`❌ AI가 ${participant.name}(${participant.id})에 대한 추천을 생성하지 않았습니다.`);
        continue;
      }

      const similarIds = normalizeIds(entry.similar, validIds, participant.id);
      const oppositeIds = normalizeIds(entry.opposite, validIds, participant.id);
      const reasons = normalizeReasons(entry.reasons);

      // 추천이 부족한 경우 경고 로그
      if (similarIds.length < 2) {
        logger.warn(`${participant.name}의 similar 추천이 ${similarIds.length}명뿐입니다.`);
      }
      if (oppositeIds.length < 2) {
        logger.warn(`${participant.name}의 opposite 추천이 ${oppositeIds.length}명뿐입니다.`);
      }

      // 정확히 2명씩만 할당 (AI가 더 많이 제공하더라도)
      assignments[participant.id] = {
        similar: similarIds.slice(0, 2),
        opposite: oppositeIds.slice(0, 2),
        reasons,
      };
    }

    // 누락된 assignments 에러 처리
    if (missingAssignments.length > 0) {
      const errorMsg = `AI가 ${missingAssignments.length}명에 대한 추천을 생성하지 않았습니다: ${missingAssignments.join(', ')}`;
      logger.error(`🚨 ${errorMsg}`);
      throw new Error(`매칭 생성 실패: ${errorMsg}. AI 매칭을 다시 실행해주세요.`);
    }

    // AI 매칭 완료
    const matching = { assignments };

    // 매칭 검증 (강화된 검증: 4명 추천, 성별 균형, 자기 제외)
    const validation = validateMatching(matching, participants);

    if (!validation.valid) {
      logger.error('🚨 매칭 검증 실패', {
        errors: validation.errors,
        action: '관리자가 수동으로 조정 필요',
      });
      // 검증 실패해도 일단 결과는 반환 (관리자가 수동 조정 가능)
    }

    logger.info('✅ AI 매칭 완료 (수동 검토 대기)', {
      question,
      participantCount: participants.length,
      assignmentsCount: Object.keys(assignments).length,
      validationPassed: validation.valid,
    });

    return matching;
  } catch (error) {
    logger.error('AI 매칭 실패:', error);
    throw error;
  }
}

/**
 * AI 매칭 함수 (단순 버전 - retry 없음)
 * Human-in-the-loop 방식: AI가 초안을 생성하고 관리자가 수동으로 검토/조정
 */
export async function matchParticipantsByAI(
  question: string,
  participants: ParticipantAnswer[]
): Promise<MatchingResult> {
  logger.info('AI 매칭 시작 (Human-in-the-loop)', { participantCount: participants.length });

  // 단순히 내부 함수 호출 (retry 없음)
  return await _matchParticipantsByAI(question, participants);
}
