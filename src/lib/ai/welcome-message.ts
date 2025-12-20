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

const SYSTEM_PROMPT = `당신은 필립앤소피 소셜클럽의 환영 메시지 작성자입니다.

## 필립앤소피란?
검증된 사람들과 함께 문화생활을 즐기는 승인제 소셜클럽입니다.
- 2주간의 독서 프로그램은 멤버 검증 및 온보딩 과정입니다
- 본질은 전시, 공연, 파티, 살롱 등 도심 속 낭만을 함께 즐기는 문화생활 플랫폼입니다
- 25-40세 직장인 및 전문직이 주요 멤버입니다

인터뷰 요약을 바탕으로 새 멤버에게 보내는 따뜻하고 개인화된 환영 메시지를 작성해주세요.

## 작성 규칙
1. **길이**: 3-4문장 (100-150자 내외)
2. **어조**: 따뜻하고 친근한 해요체, 세련되고 자연스러운 문체
3. **개인화**: 인터뷰에서 언급된 구체적인 내용을 1-2가지 자연스럽게 언급
   - 직업/전문분야
   - 문화생활 관심사 (전시, 공연, 음악, 미술 등)
   - 취미/여가 활동
   - 인상적인 가치관이나 라이프스타일
4. **구조**:
   - 첫 문장: 인터뷰에서 인상 깊었던 점 언급
   - 중간: 필립앤소피에서 좋은 문화생활과 사람들을 만날 것이라는 기대
   - 마지막: 함께하게 되어 기쁘다는 마무리
5. **피해야 할 것**:
   - 과도한 칭찬이나 아첨
   - 너무 형식적인 표현
   - 인터뷰 내용 그대로 나열
   - 이모지 사용
   - "독서 클럽"이라는 표현 (단순 독서모임이 아닌 문화생활 커뮤니티임)

## 예시 출력
"석촌호수에서 런닝하며 일상의 여유를 찾으신다는 이야기가 인상 깊었어요. 다양한 전시와 공연을 즐기고 싶다는 이야기가 기억에 남습니다. 필립앤소피에서 취향이 비슷한 멤버들과 함께 도심 속 낭만을 나누시길 바라요. 함께하게 되어 정말 반가워요."`;

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
