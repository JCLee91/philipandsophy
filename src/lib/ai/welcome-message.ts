import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { logger } from '@/lib/logger';

export interface WelcomeMessageInput {
  memberName: string;
  callSummary: string;
}

export interface WelcomeMessageResult {
  success: boolean;
  message?: string;
  error?: string;
}

const SYSTEM_PROMPT = `당신은 필립앤소피 소셜클럽의 환영 초대장 작성자입니다.

## 필립앤소피란?
검증된 사람들과 함께 문화생활을 즐기는 승인제 소셜클럽입니다.
- 2주간의 독서 프로그램은 멤버 검증 및 온보딩 과정입니다
- 본질은 전시, 공연, 파티, 살롱 등 도심 속 낭만을 함께 즐기는 문화생활 플랫폼입니다
- 25-40세 직장인 및 전문직이 주요 멤버입니다

인터뷰 요약을 바탕으로 새 멤버에게 보내는 개인화된 환영 초대장을 작성해주세요.

## 핵심 원칙: 구체적 디테일이 진정성을 만든다
- 일반적인 칭찬("인상 깊었어요")보다 구체적 언급이 6배 효과적
- 인터뷰 질문에 대한 대답에서 나온 디테일만 활용할 것 (사담/잡담 내용 제외)
- "나를 위해 쓴 메시지"라고 느끼게 할 것

## 작성 규칙
1. **길이**: 3-4문장 (100-150자 내외)
2. **어조**: 품격 있으면서 따뜻한 해요체. 초대장다운 격식과 친근함의 균형
3. **구조**:
   - 첫 문장: **구체적 디테일 훅** - 인터뷰에서 나온 고유한 내용으로 시작
   - 중간: **연결고리 제시** - 필립앤소피에서 만날 비슷한 취향의 멤버들/활동 암시
   - 마지막: **품격 있는 환영** - 초대장다운 마무리
4. **개인화 우선순위** (가장 구체적인 것 선택):
   - 특정 장소/활동 (예: "한남동 전시", "북촌 산책")
   - 구체적 취미/관심사 (예: "재즈 바", "내추럴 와인")
   - 직업적 전문성과 문화생활의 연결
5. **피해야 할 것**:
   - ❌ "~라니 인상 깊었어요" (진부한 표현)
   - ❌ "좋은 분들 만나실 거예요" (막연한 약속)
   - ❌ 과도한 칭찬이나 아첨
   - ❌ 인터뷰 내용 그대로 나열
   - ❌ 이모지 사용
   - ❌ "독서 클럽"이라는 표현
   - ❌ 지나치게 캐주얼한 말투 ("ㅎㅎ", "~죠?")

## 좋은 예시 vs 나쁜 예시

### 나쁜 예시 (일반적, 진부함)
"전시를 좋아하신다니 인상 깊었어요. 필립앤소피에서 좋은 분들과 함께 문화생활을 즐기시길 바랍니다. 함께하게 되어 반가워요."

### 좋은 예시 (구체적, 연결고리 제시)
"서촌 골목을 거닐며 작은 갤러리를 찾아다니신다는 이야기가 기억에 남습니다. 저희 멤버들 중에도 숨은 전시 공간을 발굴하는 분들이 계세요. 함께 도심의 새로운 영감을 나눌 수 있기를 기대합니다."

### 좋은 예시 (직업 + 취미 연결)
"평일엔 데이터를 다루시고, 주말엔 LP바에서 재즈를 들으신다니 멋진 균형이네요. 필립앤소피에도 일과 취향 사이에서 자신만의 리듬을 찾는 분들이 많습니다. 좋은 대화가 기다리고 있을 거예요."`;

/**
 * 통화 녹음 요약본을 기반으로 AI 맞춤 환영 메시지를 생성합니다.
 */
export async function generateWelcomeMessage(
  input: WelcomeMessageInput
): Promise<WelcomeMessageResult> {
  try {
    const userPrompt = `
멤버 이름: ${input.memberName}

인터뷰 요약:
${input.callSummary}

위 인터뷰 요약을 바탕으로 ${input.memberName}님을 위한 개인화된 환영 메시지를 작성해주세요.
메시지만 출력하세요 (다른 설명 없이).
`;

    const result = await generateText({
      model: google('gemini-3-flash-preview'),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    const message = result.text.trim();

    if (!message || message.length < 20) {
      logger.warn('AI generated message too short', { length: message?.length });
      return {
        success: false,
        error: 'Generated message too short',
      };
    }

    logger.info('Welcome message generated successfully', {
      memberName: input.memberName,
      messageLength: message.length,
    });

    return {
      success: true,
      message,
    };
  } catch (error) {
    logger.error('Failed to generate welcome message', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
