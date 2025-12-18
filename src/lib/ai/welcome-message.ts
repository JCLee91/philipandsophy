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

const SYSTEM_PROMPT = `당신은 필립앤소피 독서 클럽의 환영 메시지 작성자입니다.

인터뷰 요약을 바탕으로 새 멤버에게 보내는 따뜻하고 개인화된 환영 메시지를 작성해주세요.

## 작성 규칙
1. **길이**: 3-4문장 (100-150자 내외)
2. **어조**: 따뜻하고 친근한 해요체
3. **개인화**: 인터뷰에서 언급된 구체적인 내용을 1-2가지 자연스럽게 언급
   - 직업/관심사
   - 독서모임 지원 동기
   - 취미/여가 활동
   - 인상적인 가치관이나 특성
4. **구조**:
   - 첫 문장: 인터뷰에서 인상 깊었던 점 언급
   - 중간: 해당 멤버가 클럽에서 좋은 경험을 할 것이라는 기대
   - 마지막: 함께하게 되어 기쁘다는 마무리
5. **피해야 할 것**:
   - 과도한 칭찬이나 아첨
   - 너무 형식적인 표현
   - 인터뷰 내용 그대로 나열
   - 이모지 사용

## 예시 출력
"석촌호수에서 런닝하며 일상의 여유를 찾으신다는 이야기가 인상 깊었어요. 다양한 분야의 책을 탐험하고 싶다는 열정이 느껴졌습니다. 필립앤소피에서 좋은 책들과 멤버들을 만나시길 바라요. 함께하게 되어 정말 반가워요."`;

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
