import OpenAI from 'openai';
import { logger } from './logger';
import type { DailyMatchingReasons, DailyParticipantAssignment } from '@/types/database';

// OpenAI 클라이언트는 함수 내부에서 생성 (환경 변수 로드 후)
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
 * AI 응답의 성별 균형 검증
 */
function validateGenderBalance(
  matching: MatchingResult,
  participants: ParticipantAnswer[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const genderMap = new Map(participants.map(p => [p.id, p.gender]));

  // Featured 검증
  if (!hasGenderBalance(matching.featured.similar, genderMap)) {
    errors.push('Featured similar 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.');
  }

  if (!hasGenderBalance(matching.featured.opposite, genderMap)) {
    errors.push('Featured opposite 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.');
  }

  // 모든 참가자의 assignments 검증
  for (const [participantId, assignment] of Object.entries(matching.assignments)) {
    if (!hasGenderBalance(assignment.similar, genderMap)) {
      const participant = participants.find(p => p.id === participantId);
      errors.push(`${participant?.name || participantId}의 similar 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.`);
    }

    if (!hasGenderBalance(assignment.opposite, genderMap)) {
      const participant = participants.find(p => p.id === participantId);
      errors.push(`${participant?.name || participantId}의 opposite 그룹이 성별 균형(1남+1여)을 만족하지 않습니다.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * OpenAI를 사용하여 일일 질문에 대한 참가자들의 답변을 분석하고
 * 모든 참가자별 추천 프로필북 목록을 생성합니다.
 */
export async function matchParticipantsByAI(
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
1. 모든 참가자에게 각각 "비슷한 가치관" 2명과 "상반된 가치관" 2명을 추천합니다.
2. **성별 균형 규칙 (매우 중요):**
   - 비슷한 가치관 2명: 남성 1명 + 여성 1명
   - 상반된 가치관 2명: 남성 1명 + 여성 1명
   - 총 4명의 프로필북: 남성 2명 + 여성 2명
3. 동일한 사람을 중복 추천하지 말고, 본인(ID)을 결과에 포함하지 마세요.
4. 추천 이유는 핵심만 1~2문장으로 요약합니다.
5. 전체 그룹에서 오늘의 서재에 공개할 대표 4명(비슷한 2명, 반대 2명)을 선정하세요.
6. **모든 참가자의 프로필북이 최소 1명에게는 추천되어야 합니다.**

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
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

    // AI 응답 성별 균형 검증
    const matching = { featured, assignments };
    const validation = validateGenderBalance(matching, participants);

    if (!validation.valid) {
      logger.error('AI 매칭 결과 성별 균형 검증 실패', {
        errors: validation.errors,
      });
      throw new Error(
        `AI 매칭 결과가 성별 균형 요구사항을 충족하지 않습니다:\n${validation.errors.join('\n')}`
      );
    }

    logger.info('AI 매칭 완료 (성별 균형 검증 통과)', {
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
