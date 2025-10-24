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
  assignments?: Record<string, RawParticipantAssignment>;
}

const DEFAULT_REASON_PLACEHOLDER = '사유가 제공되지 않았습니다.';

/**
 * 매칭 이유 정규화 함수 (통합 버전)
 * - null/undefined 처리
 * - 문자열 trim 및 검증
 * - placeholder 자동 주입
 */
function normalizeReasons(reasons?: unknown): DailyMatchingReasons {
  // null/undefined는 placeholder 반환
  if (!reasons || typeof reasons !== 'object') {
    logger.warn('AI matching reasons missing or invalid, using placeholder', { reasons });
    return {
      similar: DEFAULT_REASON_PLACEHOLDER,
      opposite: DEFAULT_REASON_PLACEHOLDER,
    };
  }

  const r = reasons as Record<string, unknown>;
  const result: DailyMatchingReasons = {
    similar: typeof r.similar === 'string' && r.similar.trim()
      ? r.similar.trim()
      : DEFAULT_REASON_PLACEHOLDER,
    opposite: typeof r.opposite === 'string' && r.opposite.trim()
      ? r.opposite.trim()
      : DEFAULT_REASON_PLACEHOLDER,
  };

  // summary는 선택적
  if (typeof r.summary === 'string' && r.summary.trim()) {
    result.summary = r.summary.trim();
  }

  return result;
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
 * 매칭 검증 함수 (단순화 버전)
 * 치명적인 문제만 체크: 추천을 받지 못한 참가자가 있는지 확인
 */
function validateMatching(
  matching: MatchingResult,
  participants: ParticipantAnswer[]
): void {
  const recommendationCounts = new Map<string, number>();

  // 모든 추천 카운트
  for (const assignment of Object.values(matching.assignments)) {
    [...assignment.similar, ...assignment.opposite].forEach(id =>
      recommendationCounts.set(id, (recommendationCounts.get(id) || 0) + 1)
    );
  }

  // 추천을 받지 못한 참가자 찾기 (치명적 오류)
  const unrecommended = participants.filter(p => !recommendationCounts.has(p.id));

  if (unrecommended.length > 0) {
    logger.error('🚨 치명적 오류: 추천을 받지 못한 참가자 발견', {
      count: unrecommended.length,
      names: unrecommended.map(p => p.name),
      action: 'AI 매칭 재실행 필요',
    });
  } else {
    const avgRecommendations = (
      Array.from(recommendationCounts.values()).reduce((a, b) => a + b, 0) /
      recommendationCounts.size
    ).toFixed(1);

    logger.info('✅ 매칭 검증 완료', {
      totalParticipants: participants.length,
      avgRecommendations,
    });
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

    logger.info('🤖 OpenAI API 호출 시작', {
      model: 'gpt-5-mini',
      participantCount: participants.length,
      promptLength: prompt.length,
    });

    const apiStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
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

    // 매칭 검증 (치명적 오류만 체크)
    validateMatching(matching, participants);

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
