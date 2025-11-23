import { ClusteringStrategy, DailySubmission } from './types';

// ============================================================
// 상수 설정
// ============================================================

export const CLUSTER_CONFIG = {
    /** 본인 포함 최소 크기 (프로필북 4개 보임) */
    MIN_SIZE: 5,
    /** 본인 포함 최대 크기 (프로필북 6개 보임) */
    MAX_SIZE: 7,
    /** 목표 크기 */
    TARGET_SIZE: 6,
} as const;

// ============================================================
// 클러스터링 전략 결정
// ============================================================

/**
 * 날짜 기반 클러스터링 전략 결정 (3일 주기 순환)
 *
 * - Day 0, 3, 6, 9... : 가치관 중심
 * - Day 1, 4, 7, 10...: 감정/정서 중심
 * - Day 2, 5, 8, 11...: AI 자율 판단
 *
 * @param dateStr 매칭 날짜 (YYYY-MM-DD)
 * @returns 오늘의 클러스터링 전략
 */
export function getClusteringStrategy(dateStr: string): ClusteringStrategy {
    const dayOfMonth = new Date(dateStr).getDate();
    const cycle = dayOfMonth % 3;

    switch (cycle) {
        case 0: // 가치관 중심일
            return {
                mode: 'focused',
                focus: '가치관과 삶의 우선순위',
                instruction: '오늘의 답변에서 드러나는 가치관과 삶의 우선순위를 최우선 기준으로 그룹핑하세요.'
            };

        case 1: // 감정/정서 중심일
            return {
                mode: 'focused',
                focus: '현재 감정 상태와 정서적 톤',
                instruction: '감상평과 답변에서 느껴지는 감정 상태, 에너지, 정서적 톤을 최우선 기준으로 그룹핑하세요.'
            };

        case 2: // AI 자율 판단일
            return {
                mode: 'autonomous',
                instruction: '오늘의 데이터에서 가장 의미있는 차원을 스스로 발견하고, 그 기준으로 그룹핑하세요. 매번 다른 관점을 시도하세요. (예: 사고 방식, 관심 주제, 표현 스타일, 책 반응 깊이 등)'
            };

        default:
            return {
                mode: 'focused',
                focus: '가치관과 삶의 우선순위',
                instruction: '오늘의 답변에서 드러나는 가치관과 삶의 우선순위를 최우선 기준으로 그룹핑하세요.'
            };
    }
}

// ============================================================
// AI 프롬프트 생성
// ============================================================

/**
 * AI 프롬프트용 데이터 포맷팅
 */
export function formatSubmissionsForPrompt(submissions: DailySubmission[]): string {
    return submissions.map(s => `
[${s.participantId}] ${s.participantName}
- 읽은 책: ${s.bookTitle}${s.bookAuthor ? ` (${s.bookAuthor})` : ''}
- 오늘의 감상평: ${s.review}
- 오늘의 질문: ${s.dailyQuestion}
- 오늘의 답변: ${s.dailyAnswer}
`).join('\n---\n');
}

/**
 * 클러스터링 프롬프트 생성
 */
export function generateClusterPrompt(
    submissions: DailySubmission[],
    strategy: ClusteringStrategy,
    config: {
        participantCount: number;
        targetClusterCount: number;
        membersPerCluster: number;
        isSmallGroup: boolean;
        isEdgeCase: boolean;
    }
): string {
    const { participantCount, targetClusterCount, membersPerCluster, isSmallGroup, isEdgeCase } = config;
    const formattedData = formatSubmissionsForPrompt(submissions);

    const commonRules = `
⚠️ 중요 규칙:
1. 같은 책을 읽는다고 같은 주제로 묶지 마세요
   - 여러 날 같은 책을 읽으므로 책 자체는 기준이 아님
   - 책 정보는 감상평 맥락 이해를 위한 참고용으로만 사용
2. 오늘의 감상평 + 오늘의 답변에서 드러나는 공통점을 찾으세요
   - 가치관, 감정 상태, 사고방식, 관심 주제 등을 기준으로 분석
   - 이 사람들이 서로 대화하면 공감하고 소통할 수 있는 공통점을 찾으세요
3. 개인차가 있더라도 전체를 아우르는 포괄적 주제를 만드세요
4. **각 참가자는 정확히 1개 클러스터에만 배정되어야 합니다**
   - 중복 배정 절대 금지 (한 사람이 여러 그룹에 들어가면 안 됨)
   - 누락 금지 (모든 참가자가 반드시 어딘가에 배정되어야 함)
`;

    const autonomousInstruction = strategy.mode === 'autonomous' ? `
먼저 오늘의 데이터 특성을 간단히 분석하고, 어떤 공통 주제가 있는지 스스로 발견한 후,
그 주제를 기반으로 그룹 이름과 테마를 만드세요.
` : '';

    const namingRules = `
클러스터 이름 및 카테고리 규칙:
- 간결하고 감각적인 이름 (2~4단어, "오늘의" 같은 접두사 없이)
- theme은 오늘의 공통 주제를 명사형으로 (30자 이내)
- reasoning은 해요체로 작성 (친근하고 자연스럽게)
- **category**: 클러스터링의 기준이 된 핵심 키워드 (예: "감상평", "가치관", "정서", "생활습관", "취향" 등)
  - 오늘의 질문이 "가치관" 관련이면 "가치관" 또는 질문의 핵심 키워드 사용
  - 감상평 위주로 묶였다면 "감상평" 사용
  - 정서나 감정이 기준이면 "정서" 또는 "감정" 사용

예시:
{
  "id": "cluster1",
  "name": "공간 로맨티스트",
  "emoji": "🏛️",
  "category": "공간 취향",
  "theme": "공간과 장소에 대한 감성적 탐구",
  "memberIds": ["user1", "user2", "user3", "user4", "user5"],
  "reasoning": "공간의 의미와 장소가 주는 감정에 대해 깊이 있게 사유해요"
}

좋은 이름 예시:
- "공간 로맨티스트", "시간 여행자", "감정 탐험가", "관계의 철학자"
- "일상의 시인", "변화의 관찰자", "내면의 건축가", "경계의 탐험가"

피해야 할 이름:
- "오늘의 XXX" (너무 형식적)
- "~하는 사람들" (너무 직설적)
- 너무 긴 이름 (5단어 이상)

문체 규칙:
- theme은 명사형으로 작성 ("~을 나눠요" ❌, "~에 대한 탐구" ✅)
- reasoning은 해요체 사용 ("~입니다" ❌, "~해요" ✅)
- 친근하고 자연스러운 표현 선호
- 예시:
  - theme: "삶의 본질에 대한 공통된 고민" ✅
  - reasoning: "삶의 본질에 대해 함께 고민해요" ✅
`;

    if (isSmallGroup) {
        return `
오늘 독서 인증을 한 ${participantCount}명의 공통점과 주제를 찾아주세요.
이들은 하나의 그룹이 되며, 그룹의 이름, 주제, 공통점을 만들어주세요.

[전략 모드: ${strategy.mode}]
${strategy.mode === 'focused' ? `오늘의 분석 초점: ${strategy.focus}` : ''}

${strategy.instruction}

${commonRules}

참가자 데이터:
${formattedData}

${autonomousInstruction}

${namingRules}

⚠️ 필수 제약 (엄격히 준수):
- 정확히 1개 클러스터 생성
- 모든 참가자 포함: ${participantCount}명 전원
- memberIds에 모든 participantId 포함 (중복 없이, 누락 없이)
- 각 participantId는 정확히 1번만 등장해야 함

응답 전 필수 체크리스트:
✓ memberIds 배열의 총 개수 = ${participantCount}명?
✓ 중복된 participantId가 없는가?
✓ 모든 participantId가 포함되었는가?
`.trim();
    }

    if (isEdgeCase) {
        return `
오늘 독서 인증을 한 ${participantCount}명을 정확히 2개 그룹으로 나눠주세요.
각 그룹은 4~5명씩입니다.

[전략 모드: ${strategy.mode}]
${strategy.mode === 'focused' ? `오늘의 클러스터링 초점: ${strategy.focus}` : ''}

${strategy.instruction}

${commonRules}

참가자 데이터:
${formattedData}

${autonomousInstruction}

${namingRules}

⚠️ 필수 제약 (엄격히 준수):
- 정확히 2개 클러스터 생성
- 모든 참가자 포함: 총합 ${participantCount}명 정확히 배정
- 각 클러스터는 4~5명 (${participantCount === 8 ? '4명+4명' : '4명+5명'})
- 각 participantId는 정확히 1번만 등장해야 함 (중복 배정 금지)

응답 전 필수 체크리스트:
✓ 클러스터 개수 = 2개?
✓ cluster1.memberIds + cluster2.memberIds 총 개수 = ${participantCount}명?
✓ 중복된 participantId가 없는가?
✓ 모든 participantId가 포함되었는가?
`.trim();
    }

    // 다중 클러스터 (10명 이상)
    return `
오늘 독서 인증을 한 ${participantCount}명을 ${targetClusterCount}개 그룹으로 나눠주세요.
각 그룹은 약 ${membersPerCluster}명씩입니다.

[전략 모드: ${strategy.mode}]
${strategy.mode === 'focused' ? `오늘의 클러스터링 초점: ${strategy.focus}` : ''}

${strategy.instruction}

${commonRules}

참가자 데이터:
${formattedData}

${autonomousInstruction}

${namingRules}

⚠️ 필수 제약 (엄격히 준수):
- 클러스터 개수: ${targetClusterCount}개 (±1개 허용)
- 모든 참가자 포함: 총합 ${participantCount}명 정확히 배정
- 클러스터 크기: 최소 1명, 최대 ${CLUSTER_CONFIG.MAX_SIZE}명
- 각 participantId는 정확히 1번만 등장해야 함 (중복 배정 금지)

응답 전 필수 체크리스트:
✓ 모든 클러스터의 memberIds 총 개수 = ${participantCount}명?
✓ 중복된 participantId가 없는가?
✓ 모든 participantId가 포함되었는가?
✓ 각 클러스터 크기가 1~${CLUSTER_CONFIG.MAX_SIZE}명 범위 내인가?
`.trim();
}
