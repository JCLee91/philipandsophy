import { DailySubmission } from './types';

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
// 클러스터링 축 프레임워크 (데이터 기반 동적 선택)
// ============================================================

/**
 * 클러스터링 축 정의
 * AI가 오늘의 데이터를 보고 가장 의미있는 축을 선택하도록 안내
 */
export const CLUSTERING_AXES_FRAMEWORK = `
## 🎯 클러스터링 축 선택

오늘의 데이터(감상평 + 답변)를 먼저 훑어보고,
아래 축 중 **가장 의미있는 공통점을 발견할 수 있는 축 1~2개**를 선택하세요.

### 선택 가능한 축
| 축 | 설명 | 찾아볼 곳 |
|----|------|-----------|
| **가치관** | 삶의 우선순위, 신념, 중요하게 여기는 것 | 주로 답변에서 |
| **감정/정서** | 현재 감정 상태, 에너지, 정서적 톤 | 감상평 + 답변 |
| **관심사** | 드러나는 관심 주제, 키워드 | 감상평 + 답변 |
| **사고방식** | 분석적/감성적, 현실적/이상적 등 | 답변 스타일에서 |
| **표현 스타일** | 글의 깊이, 유머, 묘사 방식 | 전체적인 톤에서 |
| **책 반응** | 몰입도, 비평적 시각, 공감 수준 | 감상평에서 |

### 축 선택 기준
1. 오늘 데이터에서 **실제로 패턴이 보이는** 축을 선택
2. 그 축으로 묶었을 때 **서로 대화가 통할 것 같은** 그룹이 만들어지는지
3. 오늘의 질문 내용과 **자연스럽게 연결**되는 축 우선

### 중요
- 선택한 축이 곧 **category**가 됩니다
- **reasoning**에 왜 이 축을 선택했는지 포함하세요
`.trim();

/**
 * 다양성 보장을 위한 히스토리 기반 가이드 생성
 * @param recentCategories 최근 N일간 사용된 카테고리 배열
 */
export function getDiversityInstruction(recentCategories: string[]): string {
    if (recentCategories.length === 0) {
        return '';
    }
    
    return `
### 다양성 가이드
최근 사용된 클러스터링 축: [${recentCategories.join(', ')}]
가능하다면 이와 **다른 축**을 우선 탐색해보세요.
단, 오늘 데이터에서 의미있는 패턴이 없다면 같은 축도 괜찮습니다.
`.trim();
}

// ============================================================
// AI 프롬프트 생성
// ============================================================

/**
 * AI 프롬프트용 데이터 포맷팅
 */
export function formatSubmissionsForPrompt(submissions: DailySubmission[]): string {
    return submissions.map(s => {
        const genderStr = s.gender === 'male' ? '남' : s.gender === 'female' ? '여' : s.gender;
        const genderInfo = genderStr ? ` (${genderStr})` : '';
        return `
[${s.participantId}] ${s.participantName}${genderInfo}
- 읽은 책: ${s.bookTitle}${s.bookAuthor ? ` (${s.bookAuthor})` : ''}
- 오늘의 감상평: ${s.review}
- 오늘의 질문: ${s.dailyQuestion}
- 오늘의 답변: ${s.dailyAnswer}
`;
    }).join('\n---\n');
}

/**
 * 클러스터링 프롬프트 생성 (v4: 데이터 기반 동적 축 선택)
 */
export function generateClusterPrompt(
    submissions: DailySubmission[],
    config: {
        participantCount: number;
        targetClusterCount: number;
        membersPerCluster: number;
        isSmallGroup: boolean;
        isEdgeCase: boolean;
        recentCategories?: string[]; // 최근 N일간 사용된 카테고리 (다양성 보장용)
    }
): string {
    const { participantCount, targetClusterCount, membersPerCluster, isSmallGroup, isEdgeCase, recentCategories = [] } = config;
    const formattedData = formatSubmissionsForPrompt(submissions);
    const diversityInstruction = getDiversityInstruction(recentCategories);

    const commonRules = `
⚠️ 필수 규칙:
1. **같은 책 = 같은 그룹이 아닙니다**
   - 여러 날 같은 책을 읽으므로 책 자체는 기준이 아님
   - 책 정보는 감상평 맥락 이해를 위한 참고용으로만 사용
2. **선택한 축을 기준으로 공통점을 찾으세요**
   - 서로 대화하면 공감하고 소통할 수 있는 사람들을 묶으세요
   - 개인차가 있더라도 전체를 아우르는 포괄적 주제를 만드세요
3. 🚨 **[필수] 단일 성별 클러스터 절대 금지 (위반 시 전체 결과 무효)**
   - 모든 클러스터에 남성과 여성이 **최소 1명씩 반드시** 포함되어야 합니다
   - 주제 유사성보다 성비 균형이 **더 중요**합니다
   - 예시: 남성 6명이 비슷한 주제여도 절대 한 클러스터로 묶지 말고, 다른 클러스터의 여성과 교환하세요
4. **각 참가자는 정확히 1개 클러스터에만 배정**
   - 중복 배정 절대 금지 (한 사람이 여러 그룹에 들어가면 안 됨)
   - 누락 금지 (모든 참가자가 반드시 어딘가에 배정되어야 함)
5. **참가자 ID(participantId)를 절대 변경하지 마세요**
   - 입력된 ID를 그대로 사용 (대괄호 [] 안의 값이 ID입니다)
   - 이름을 ID로 사용하지 마세요
`;

    const namingRules = `
## 출력 형식

### 클러스터 구조
{
  "id": "cluster1",
  "name": "공간 로맨티스트",
  "emoji": "🏛️",
  "category": "공간 취향",  // ← 선택한 축의 핵심 키워드
  "theme": "공간과 장소에 대한 감성적 탐구",
  "memberIds": ["user1", "user2", "user3", "user4", "user5"],
  "reasoning": "공간의 의미와 장소가 주는 감정에 대해 깊이 있게 사유해요. 물리적 공간을 넘어 그 안에 담긴 기억과 감정을 탐구하고 있어요. 각자의 경험을 통해 공간이 어떻게 우리의 삶을 형성하는지 성찰하고 있어요."
}

### 필드별 규칙
- **name**: 간결하고 감각적인 이름 (2~4단어, "오늘의" 접두사 없이)
  - 좋은 예: "공간 로맨티스트", "시간 여행자", "감정 탐험가", "관계의 철학자"
  - 피할 것: "오늘의 XXX", "~하는 사람들", 5단어 이상
- **category**: 선택한 클러스터링 축의 핵심 키워드 (예: "가치관", "감정", "관심사", "사고방식")
- **theme**: 공통 주제를 명사형으로 (30자 이내, "~에 대한 탐구" ✅, "~을 나눠요" ❌)
- **reasoning**: 해요체로 3~4문장 (친근하게, 구체적으로)
  - 1문장: 왜 이 축을 선택했는지 + 공통점의 핵심
  - 2~3문장: 구체적인 근거와 맥락 제시
`;

    if (isSmallGroup) {
        return `
# 오늘의 클러스터링

오늘 독서 인증을 한 ${participantCount}명을 **1개 그룹**으로 묶어주세요.

${CLUSTERING_AXES_FRAMEWORK}

${diversityInstruction}

${commonRules}

---

## 참가자 데이터
${formattedData}

---

${namingRules}

## ⚠️ 필수 제약 (엄격히 준수)
- 정확히 1개 클러스터 생성
- 모든 참가자 포함: ${participantCount}명 전원
- memberIds에 모든 participantId 포함 (중복 없이, 누락 없이)

## 응답 전 체크리스트
✓ memberIds 배열의 총 개수 = ${participantCount}명?
✓ 중복된 participantId가 없는가?
✓ 모든 participantId가 포함되었는가?
✓ category가 선택한 축과 일치하는가?
`.trim();
    }

    if (isEdgeCase) {
        return `
# 오늘의 클러스터링

오늘 독서 인증을 한 ${participantCount}명을 **2개 그룹**으로 나눠주세요.
각 그룹은 4~5명씩입니다.

${CLUSTERING_AXES_FRAMEWORK}

${diversityInstruction}

${commonRules}

---

## 참가자 데이터
${formattedData}

---

${namingRules}

## ⚠️ 필수 제약 (엄격히 준수)
- 정확히 2개 클러스터 생성
- 모든 참가자 포함: 총합 ${participantCount}명 정확히 배정
- 각 클러스터는 4~5명 (${participantCount === 8 ? '4명+4명' : '4명+5명'})
- 각 participantId는 정확히 1번만 등장 (중복 배정 금지)

## 응답 전 체크리스트
✓ 클러스터 개수 = 2개?
✓ cluster1.memberIds + cluster2.memberIds 총 개수 = ${participantCount}명?
✓ 중복된 participantId가 없는가?
✓ 모든 participantId가 포함되었는가?
✓ 🚨 각 클러스터에 남성과 여성이 최소 1명씩 포함되어 있는가?
✓ category가 선택한 축과 일치하는가?
`.trim();
    }

    // 다중 클러스터 (10명 이상)
    return `
# 오늘의 클러스터링

오늘 독서 인증을 한 ${participantCount}명을 **${targetClusterCount}개 그룹**으로 나눠주세요.
각 그룹은 약 ${membersPerCluster}명씩입니다.

${CLUSTERING_AXES_FRAMEWORK}

${diversityInstruction}

${commonRules}

---

## 참가자 데이터
${formattedData}

---

${namingRules}

## ⚠️ 필수 제약 (엄격히 준수)
- 클러스터 개수: ${targetClusterCount}개 (±1개 허용)
- 모든 참가자 포함: 총합 ${participantCount}명 정확히 배정
- 클러스터 크기: 최소 ${CLUSTER_CONFIG.MIN_SIZE - 1}명, 최대 ${CLUSTER_CONFIG.MAX_SIZE}명
- 각 participantId는 정확히 1번만 등장 (중복 배정 금지)

## 응답 전 체크리스트
✓ 모든 클러스터의 memberIds 총 개수 = ${participantCount}명?
✓ 중복된 participantId가 없는가?
✓ 모든 participantId가 포함되었는가?
✓ 각 클러스터 크기가 ${CLUSTER_CONFIG.MIN_SIZE - 1}~${CLUSTER_CONFIG.MAX_SIZE}명 범위 내인가?
✓ 🚨 각 클러스터에 남성과 여성이 최소 1명씩 포함되어 있는가?
✓ category가 선택한 축과 일치하는가?
`.trim();
}
