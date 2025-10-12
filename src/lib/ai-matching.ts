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

function fillIfEmpty(
  values: string[],
  fallback: string[],
  excludeId?: string
): string[] {
  if (values.length > 0) {
    return values;
  }
  if (!fallback.length) return [];
  return fallback.filter((id) => (excludeId ? id !== excludeId : true));
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

  // Featured 검증
  const featuredSimilar = matching.featured.similar
    .map(id => participantMap.get(id))
    .filter((p): p is ParticipantAnswer => p !== undefined);
  const featuredOpposite = matching.featured.opposite
    .map(id => participantMap.get(id))
    .filter((p): p is ParticipantAnswer => p !== undefined);

  const featuredSimilarGenders = featuredSimilar.map(p => p.gender);
  const featuredOppositeGenders = featuredOpposite.map(p => p.gender);

  const hasMaleAndFemaleSimilar =
    featuredSimilarGenders.includes('male') && featuredSimilarGenders.includes('female');
  const hasMaleAndFemaleOpposite =
    featuredOppositeGenders.includes('male') && featuredOppositeGenders.includes('female');

  if (!hasMaleAndFemaleSimilar) {
    violations.push(
      `Featured 비슷한 가치관: 성별 균형 위반 (${featuredSimilar.map(p => `${p.name}(${p.gender})`).join(', ')})`
    );
  }
  if (!hasMaleAndFemaleOpposite) {
    violations.push(
      `Featured 상반된 가치관: 성별 균형 위반 (${featuredOpposite.map(p => `${p.name}(${p.gender})`).join(', ')})`
    );
  }

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
당신은 독서 모임 참가자들을 매칭하는 전문가입니다.
아래 질문에 대한 참가자들의 답변을 토대로, 각 참가자가 읽으면 좋을 프로필북을 추천해주세요.

**질문:** ${question}

**참가자 답변:**
${participantPromptList}

**필수 규칙:**
1. 각 참가자에게 "비슷한 가치관" 2명과 "상반된 가치관" 2명을 추천합니다.
2. **성별 균형 (필수 - 최우선 규칙):**
   - 비슷한 가치관: 반드시 남성 1명 + 여성 1명
   - 상반된 가치관: 반드시 남성 1명 + 여성 1명
   - ⚠️ 성별이 부족한 경우에만 동일 성별 2명 허용
3. 본인(ID)은 추천에서 제외하고, 중복 추천 불가.
4. 추천 이유는 1문장으로 간결하게.
5. 전체 그룹에서 대표 4명(비슷한 2명, 반대 2명)을 선정하세요.

**응답 형식(JSON만 반환):**
{
  "featured": {
    "similar": ["id1", "id2"],
    "opposite": ["id3", "id4"],
    "reasons": {
      "similar": "비슷한 가치관 선정 이유",
      "opposite": "반대 가치관 선정 이유",
      "summary": "전체 선정 요약 (선택)"
    }
  },
  "assignments": {
    "participantId": {
      "similar": ["idA", "idB"],
      "opposite": ["idC", "idD"],
      "reasons": {
        "similar": "비슷한 추천 근거",
        "opposite": "반대 추천 근거",
        "summary": "추가 요약 (선택)"
      }
    },
    ...
  }
}

중요: JSON 형식만 반환하고 다른 텍스트는 포함하지 마세요.
`;

    logger.info('🤖 OpenAI API 호출 시작', {
      model: 'gpt-5-nano-2025-08-07',
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
            '당신은 사람들의 가치관과 생각을 분석하여 의미있는 매칭을 만드는 전문가입니다. JSON 형식으로만 응답합니다.',
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

    if (!raw.featured) {
      throw new Error('AI 응답에 featured 정보가 없습니다.');
    }
    if (!raw.assignments) {
      throw new Error('AI 응답에 assignments 정보가 없습니다.');
    }

    const rawFeaturedSimilar = normalizeIds(raw.featured.similar, validIds);
    const rawFeaturedOpposite = normalizeIds(raw.featured.opposite, validIds);
    const featuredReasons = ensureReasons(normalizeReasons(raw.featured.reasons));

    const featured = {
      similar: rawFeaturedSimilar.slice(0, 2),
      opposite: rawFeaturedOpposite.slice(0, 2),
      ...(featuredReasons ? { reasons: featuredReasons } : {}),
    };

    const assignments: Record<string, DailyParticipantAssignment> = {};

    for (const participant of participants) {
      const entry = raw.assignments[participant.id];
      const similarIds = normalizeIds(entry?.similar, validIds, participant.id);
      const oppositeIds = normalizeIds(entry?.opposite, validIds, participant.id);
      const reasons = ensureReasons(normalizeReasons(entry?.reasons));

      assignments[participant.id] = {
        similar: fillIfEmpty(similarIds, featured.similar, participant.id).slice(0, 2),
        opposite: fillIfEmpty(oppositeIds, featured.opposite, participant.id).slice(0, 2),
        ...(reasons ? { reasons } : {}),
      };
    }

    // AI 매칭 완료
    const matching = { featured, assignments };

    // 성별 균형 규칙 검증
    validateGenderBalance(matching, participants);

    logger.info('✅ AI 매칭 완료 (수동 검토 대기)', {
      question,
      featuredSimilar: featured.similar,
      featuredOpposite: featured.opposite,
      participantCount: participants.length,
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
