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

10분간의 인터뷰를 통해 느낀 인상을 바탕으로 환영 초대장을 작성해주세요.

## 작성 규칙
1. **길이**: 3-4문장 (100-150자 내외)
2. **어조**: 품격 있으면서 따뜻한 해요체. 초대장다운 격식과 친근함의 균형
3. **구조**:
   - 첫 문장: **인터뷰 인상** - 대화에서 느낀 그 사람의 매력적인 점 (성향, 태도, 가치관)
   - 중간: **환영 이유** - 왜 필립앤소피에 잘 어울릴 것 같은지
   - 마지막: **기대할 경험** - 함께할 때 누릴 수 있는 구체적인 경험
4. **피해야 할 것**:
   - ❌ 인터뷰에서 나온 구체적인 장소/활동을 그대로 언급 (감시당하는 느낌)
   - ❌ "~라니 인상 깊었어요" (진부한 표현)
   - ❌ 과도한 칭찬이나 아첨
   - ❌ 이모지 사용
   - ❌ "독서 클럽"이라는 표현
   - ❌ 지나치게 캐주얼한 말투 ("ㅎㅎ", "~죠?")

## 좋은 예시

### 예시 1 (성향 + 경험 기대)
"새로운 것에 열린 마음으로 다가가시는 모습이 인상적이었어요. 그런 태도라면 필립앤소피의 다양한 모임에서 금세 어울리실 것 같습니다. 전시 관람 후 나누는 깊은 대화, 함께하는 파티의 설렘을 기대해주세요."

### 예시 2 (가치관 + 경험 기대)
"일과 삶의 균형을 중요하게 생각하신다는 이야기가 기억에 남습니다. 비슷한 고민을 나누는 멤버들이 많아요. 주말 저녁 와인 한잔과 함께하는 살롱에서 좋은 인연을 만나보세요."`;

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
