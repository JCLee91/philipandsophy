import OpenAI from 'openai';
import { logger } from './logger';
import { MATCHING_CONFIG } from '@/constants/matching';
import type { DailyMatchingReasons, DailyParticipantAssignment } from '@/types/database';

// OpenAI 클라이언트는 함수 내부에서 생성 (환경 변수 로드 후)
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 600000, // 600초 (10분) 타임아웃
  });
}

export interface ParticipantAnswer {
  id: string;
  name: string;
  answer: string;
  gender?: 'male' | 'female' | 'other';
}

export interface MatchingResult {
  featured: {
    similar: string[];
    opposite: string[];
    reasons?: DailyMatchingReasons;
  };
  assignments: Record<string, DailyParticipantAssignment>;
}

interface RawMatchingReasons {
  similar?: unknown;
  opposite?: unknown;
  summary?: unknown;
}

interface RawParticipantAssignment {
  similar?: unknown;
  opposite?: unknown;
  reasons?: RawMatchingReasons;
}

interface RawMatchingResponse {
  featured?: {
    similar?: unknown;
    opposite?: unknown;
    reasons?: RawMatchingReasons;
  };
  assignments?: Record<string, RawParticipantAssignment>;
}

const DEFAULT_REASON_PLACEHOLDER = '사유가 제공되지 않았습니다.';

function normalizeReasonValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeReasons(reasons?: RawMatchingReasons | null): DailyMatchingReasons | undefined {
  if (!reasons) return undefined;

  const normalized: DailyMatchingReasons = {};
  const similar = normalizeReasonValue(reasons.similar);
  const opposite = normalizeReasonValue(reasons.opposite);
  const summary = normalizeReasonValue(reasons.summary);

  if (similar) {
    normalized.similar = similar;
  }
  if (opposite) {
    normalized.opposite = opposite;
  }
  if (summary) {
    normalized.summary = summary;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function ensureReasons(reasons?: DailyMatchingReasons | null): DailyMatchingReasons | undefined {
  if (!reasons) {
    return {
      similar: DEFAULT_REASON_PLACEHOLDER,
      opposite: DEFAULT_REASON_PLACEHOLDER,
    };
  }

  return {
    similar: reasons.similar ?? DEFAULT_REASON_PLACEHOLDER,
    opposite: reasons.opposite ?? DEFAULT_REASON_PLACEHOLDER,
    ...(reasons.summary ? { summary: reasons.summary } : {}),
  };
}

function normalizeIds(
  ids: unknown,
  validIds: Set<string>,
  excludeId?: string
): string[] {
  if (!Array.isArray(ids)) return [];

  const unique = new Set<string>();
  const result: string[] = [];

  ids.forEach((value) => {
    const id = String(value);
    if (!validIds.has(id)) return;
    if (excludeId && id === excludeId) return;
    if (unique.has(id)) return;
    unique.add(id);
    result.push(id);
  });

  return result;
}

/**
 * 다양성 검증 함수
 * 특정 인물이 과도하게 많은 추천을 받는지 확인
 */
function validateDiversity(
  matching: MatchingResult,
  participants: ParticipantAnswer[]
): void {
  const participantMap = new Map(participants.map(p => [p.id, p]));
  const recommendationCount = new Map<string, number>();

  // 모든 추천 카운트
  for (const assignment of Object.values(matching.assignments)) {
    for (const id of [...assignment.similar, ...assignment.opposite]) {
      recommendationCount.set(id, (recommendationCount.get(id) || 0) + 1);
    }
  }

  // 평균 및 최대 추천 수 계산
  const counts = Array.from(recommendationCount.values());
  const avgRecommendations = counts.reduce((a, b) => a + b, 0) / counts.length;
  const maxRecommendations = Math.max(...counts);

  // 과도한 추천을 받은 사람들 찾기 (평균의 2배 이상)
  const overRecommended: string[] = [];
  for (const [id, count] of recommendationCount.entries()) {
    if (count > avgRecommendations * 2) {
      const participant = participantMap.get(id);
      overRecommended.push(`${participant?.name}(${count}회)`);
    }
  }

  // 추천을 전혀 받지 못한 사람들 찾기
  const notRecommended: string[] = [];
  for (const participant of participants) {
    if (!recommendationCount.has(participant.id)) {
      notRecommended.push(participant.name);
    }
  }

  // 로깅
  logger.info('📊 다양성 분석 결과', {
    totalParticipants: participants.length,
    avgRecommendations: avgRecommendations.toFixed(1),
    maxRecommendations,
    overRecommendedCount: overRecommended.length,
    notRecommendedCount: notRecommended.length,
  });

  if (overRecommended.length > 0) {
    logger.warn(`⚠️ 과도한 추천을 받은 참가자 (평균의 2배 이상): ${overRecommended.join(', ')}`);
  }

  // 0번 추천받은 사람이 있으면 심각한 에러
  if (notRecommended.length > 0) {
    logger.error(`🚨 치명적 오류: 추천을 받지 못한 참가자 ${notRecommended.length}명 발견`);
    logger.error(`⛔ 0번 추천받은 참가자: ${notRecommended.join(', ')}`);
    logger.error(`💡 해결 방법: AI 매칭을 재실행하거나 관리자가 수동으로 추천을 추가해주세요.`);
  }

  if (overRecommended.length === 0 && notRecommended.length === 0) {
    logger.info('✅ 추천 분산도 양호');
  }
}

/**
 * 성별 균형 검증 함수
 * 각 참가자의 similar/opposite 추천이 1남 + 1녀 규칙을 따르는지 확인
 */
function validateGenderBalance(
  matching: MatchingResult,
  participants: ParticipantAnswer[]
): void {
  const participantMap = new Map(participants.map(p => [p.id, p]));
  const violations: string[] = [];

  // 각 참가자별 assignments 검증
  for (const [participantId, assignment] of Object.entries(matching.assignments)) {
    const participant = participantMap.get(participantId);
    if (!participant) continue;

    const similarAssignments = assignment.similar
      .map(id => participantMap.get(id))
      .filter((p): p is ParticipantAnswer => p !== undefined);
    const oppositeAssignments = assignment.opposite
      .map(id => participantMap.get(id))
      .filter((p): p is ParticipantAnswer => p !== undefined);

    const similarGenders = similarAssignments.map(p => p.gender);
    const oppositeGenders = oppositeAssignments.map(p => p.gender);

    const hasBalancedSimilar =
      similarGenders.includes('male') && similarGenders.includes('female');
    const hasBalancedOpposite =
      oppositeGenders.includes('male') && oppositeGenders.includes('female');

    if (!hasBalancedSimilar) {
      violations.push(
        `${participant.name} - 비슷한 가치관: 성별 균형 위반 (${similarAssignments.map(p => `${p.name}(${p.gender})`).join(', ')})`
      );
    }
    if (!hasBalancedOpposite) {
      violations.push(
        `${participant.name} - 상반된 가치관: 성별 균형 위반 (${oppositeAssignments.map(p => `${p.name}(${p.gender})`).join(', ')})`
      );
    }
  }

  // 위반 사항 로깅
  if (violations.length > 0) {
    logger.warn('⚠️ 성별 균형 규칙 위반 감지', {
      violationCount: violations.length,
      violations,
      message: '관리자가 수동으로 조정이 필요합니다.',
    });
  } else {
    logger.info('✅ 성별 균형 규칙 준수 확인');
  }
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

  const openai = getOpenAIClient();

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
응답 형식 (JSON만):
========================================

{
  "assignments": {
    "참가자ID1": {
      "similar": ["idA", "idB"],
      "opposite": ["idC", "idD"],
      "reasons": {
        "similar": "1문장",
        "opposite": "1문장"
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

JSON만 반환하세요.
`;

    logger.info('🤖 OpenAI API 호출 시작', {
      model: 'gpt-5-nano',
      participantCount: participants.length,
      promptLength: prompt.length,
    });

    const apiStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        {
          role: 'system',
          content:
            '당신은 독서 모임 매칭 전문가입니다. 모든 참가자에게 개별적으로 분석한 고유한 추천을 제공하세요. 규칙을 정확히 따르고 JSON만 반환하세요.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });
    const apiDuration = Date.now() - apiStartTime;

    logger.info('✅ OpenAI API 응답 완료', {
      duration: `${(apiDuration / 1000).toFixed(1)}초`,
      tokensUsed: completion.usage?.total_tokens,
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    const raw = JSON.parse(responseText) as RawMatchingResponse;
    const validIds = new Set(participants.map((p) => p.id));

    if (!raw.assignments) {
      throw new Error('AI 응답에 assignments 정보가 없습니다.');
    }

    // Featured는 더 이상 사용하지 않음 (하위 호환성을 위해 빈 객체 반환)
    const featured = {
      similar: [],
      opposite: [],
    };

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
      const reasons = ensureReasons(normalizeReasons(entry.reasons));

      // 추천이 부족한 경우 경고 로그
      if (similarIds.length < 2) {
        logger.warn(`${participant.name}의 similar 추천이 ${similarIds.length}명뿐입니다.`);
      }
      if (oppositeIds.length < 2) {
        logger.warn(`${participant.name}의 opposite 추천이 ${oppositeIds.length}명뿐입니다.`);
      }

      assignments[participant.id] = {
        similar: similarIds.slice(0, 2),
        opposite: oppositeIds.slice(0, 2),
        ...(reasons ? { reasons } : {}),
      };
    }

    // 누락된 assignments 에러 처리
    if (missingAssignments.length > 0) {
      const errorMsg = `AI가 ${missingAssignments.length}명에 대한 추천을 생성하지 않았습니다: ${missingAssignments.join(', ')}`;
      logger.error(`🚨 ${errorMsg}`);
      throw new Error(`매칭 생성 실패: ${errorMsg}. AI 매칭을 다시 실행해주세요.`);
    }

    // AI 매칭 완료
    const matching = { featured, assignments };

    // 중복도 검증
    validateDiversity(matching, participants);

    // 성별 균형 규칙 검증
    validateGenderBalance(matching, participants);

    logger.info('✅ AI 매칭 완료 (수동 검토 대기)', {
      question,
      participantCount: participants.length,
      assignmentsCount: Object.keys(assignments).length,
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
