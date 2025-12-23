import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export interface WelcomeMessageInput {
  memberName: string;
  callScript: string;
}

export interface WelcomeMessageResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface WelcomeMessageEvalResult {
  pass: boolean;
  length: number;
  lengthOk: boolean;
  bannedHits: string[];
  unsupportedSentences: string[];
  error?: string;
}

const SYSTEM_PROMPT = `당신은 필립앤소피 소셜클럽의 환영 초대장 작성자입니다.

## 필립앤소피란?
검증된 사람들과 함께 문화생활을 즐기는 승인제 소셜클럽입니다.
- 2주간의 독서 프로그램은 멤버 검증 및 온보딩 과정입니다
- 본질은 전시, 공연, 파티, 살롱 등 도심 속 낭만을 함께 즐기는 문화생활 플랫폼입니다
- 25-40세 직장인 및 전문직이 주요 멤버입니다

인터뷰 스크립트(통화 녹취록)를 바탕으로 새 멤버에게 보내는 개인화된 환영 초대장을 작성해주세요.

## 핵심 원칙: 구체적 디테일이 진정성을 만든다
- 일반적인 칭찬("인상 깊었어요")보다 구체적 언급이 6배 효과적
- 인터뷰 질문에 대한 대답에서 나온 디테일만 활용할 것 (사담/잡담/인사말 제외)
- "나를 위해 쓴 메시지"라고 느끼게 할 것

## 작성 규칙
1. **길이**: **4문장**, 공백 포함 250자 미만 필수. (간결하게 작성)
2. **어조**: 품격 있으면서 따뜻한 해요체. 초대장다운 격식과 친근함의 균형
3. **구조** (총 4문장):
   - 첫 문장: **구체적 디테일 훅** - 인터뷰에서 나온 고유한 내용으로 시작
   - 두 번째 문장: **담백한 리액션** - 과도한 공감보다는 인터뷰 내용에 대한 담백하고 긍정적인 코멘트
   - 세 번째 문장: **경험의 확장** - 필립앤소피에서 경험하게 될 활동이나 분위기를 사용자 취향과 연결
   - 마지막 문장: **품격 있는 환영** - 초대장다운 마무리
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
   - ❌ 인터뷰 내용을 해석하거나 추론하지 말 것 (말한 그대로만 반영)
   - ❌ **시점/빈도 추측 금지**: "주말마다", "퇴근 후", "항상", "자주" 등 인터뷰에 없는 시점 언급 절대 금지
   - ❌ **구체적 장소/행동 날조 금지**: 인터뷰에 없는 구체적 행동 묘사 금지

## 좋은 예시 vs 나쁜 예시

### 나쁜 예시 (과장/왜곡)
인터뷰: "뮤지컬 보고 싶어요"
생성: "주말마다 뮤지컬을 즐기시는" ❌
→ 인터뷰에 없는 "주말마다", "즐긴다"를 AI가 지어냄. 말한 그대로만 반영할 것.

### 나쁜 예시 (일반적, 진부함)
"전시를 좋아하신다니 인상 깊었어요. 필립앤소피에서 좋은 분들과 함께 문화생활을 즐기시길 바랍니다. 함께하게 되어 반가워요."

### 좋은 예시 (구체적, 연결고리 제시)
"서촌 골목을 거닐며 작은 갤러리를 찾아다니신다는 이야기가 기억에 남습니다. 필립앤소피가 큐레이션한 도심 속 전시 나들이에서도 새로운 영감을 발견하실 수 있을 거예요. 함께 도심의 낭만을 즐길 수 있기를 기대합니다."

### 좋은 예시 (직업 + 취미 연결)
"평일엔 데이터를 다루시고, 주말엔 LP바에서 재즈를 들으신다니 멋진 균형이네요. 필립앤소피에서의 시간이 바쁜 일상 속에서 자신만의 리듬을 되찾는 깊이 있는 휴식이 되기를 바랍니다. 곧 뵙겠습니다."`;

const MAX_GENERATION_ATTEMPTS = 3;
const WELCOME_MESSAGE_MIN_LENGTH = 100;
const WELCOME_MESSAGE_MAX_LENGTH = 250;
const WELCOME_MESSAGE_BANNED_PHRASES = [
  '독서 클럽',
  '독서클럽',
  '좋은 분들 만나실 거예요',
  '인상 깊었어요',
  'ㅎㅎ',
];

const EVAL_SYSTEM_PROMPT = `당신은 '팩트 체커'입니다.
생성된 메시지가 인터뷰 내용(스크립트)에 기반하고 있는지 확인하되, **매우 관대한 기준**을 적용하세요.

# 핵심 목표
사용자에 대해 **없는 사실을 완전히 날조한 경우**만 찾아내세요.

# 검증 규칙
1. **명백한 거짓만 적발**:
   - 인터뷰에 없는 특정 장소, 직업, 고유명사, 숫자를 언급한 경우.
   - 인터뷰 내용과 정반대되는 내용을 말한 경우.
2. **유추 및 추론 허용 (Pass)**:
   - 인터뷰 내용을 바탕으로 한 자연스러운 추론은 **모두 사실(Fact)**로 인정하세요.
3. **복합 문장 허용 (Pass)**:
   - 문장에 팩트와 감상/인사가 섞여 있는 경우, **팩트 부분만 맞으면 통과**시키세요.
   - (예: "취미가 독서라니 정말 멋지네요" -> 독서가 팩브라면 통과)
   - 뒷부분의 "멋지네요", "반갑습니다"는 검증 대상이 아닙니다.
4. **표현의 다양성 허용 (Pass)**:
   - "자주", "항상", "열심히" 같은 수식어가 붙어도 문맥상 통하면 허용하세요.
5. **그 외 무조건 통과**:
   - 인사말, 느낌, 미래에 대한 다짐, 칭찬 등은 검증하지 말고 통과시키세요.

# 요약
"이 사람이 이런 말을 한 적이 없는데?" 싶은 **심각한 날조**가 아니라면, 웬만하면 모두 **통과(Supported)**시키세요.
`;

const SentenceEvalSchema = z.object({
  sentence: z.string(),
  category: z.enum(['FACT', 'GREETING', 'CONTEXT', 'OTHER']),
  supported: z.boolean(),
  evidence: z.string().optional(),
  reason: z.string().optional(),
});

const WelcomeMessageEvalSchema = z.object({
  sentenceEvals: z.array(SentenceEvalSchema),
});



function getEvalModel() {
  const provider = process.env.EVAL_AI_PROVIDER || process.env.AI_PROVIDER || 'google';
  const modelName = process.env.EVAL_AI_MODEL || process.env.AI_MODEL || 'gemini-3-flash-preview';

  switch (provider) {
    case 'anthropic':
      return anthropic(modelName);
    case 'openai':
      return openai(modelName);
    case 'google':
    default:
      return google(modelName);
  }
}

async function evaluateWelcomeMessage(
  callScript: string,
  message: string
): Promise<WelcomeMessageEvalResult> {
  const length = message.length;
  const lengthOk = length >= WELCOME_MESSAGE_MIN_LENGTH && length <= WELCOME_MESSAGE_MAX_LENGTH;
  const bannedHits = WELCOME_MESSAGE_BANNED_PHRASES.filter((phrase) => message.includes(phrase));

  try {
    const prompt = `통화 녹취록 (Call script):
${callScript}

생성된 메시지 (Message):
${message}

수행 작업:
1) 메시지를 문장 단위로 분리하세요.
2) 각 문장의 카테고리를 분류하세요 (CLASSIFY):
   - FACT: 사용자에 대한 구체적 사실 주장 (예: "회원님은 X를 좋아하시죠").
   - GREETING: 환영 인사, 안부.
   - CONTEXT: 클럽 소개, 미래에 대한 약속("~만나게 될 겁니다"), 일반적인 칭찬.
   - OTHER: 그 외.
3) 카테고리가 'FACT'인 경우: 스크립트에 근거한 내용인지 확인하세요. (근거가 있으면 supported=true, 없으면 supported=false).
4) 카테고리가 'GREETING', 'CONTEXT', 'OTHER'인 경우: 항상 supported=true로 설정하세요.
JSON 형식으로 반환하세요.`;

    const result = await generateObject({
      model: getEvalModel(),
      schema: WelcomeMessageEvalSchema,
      system: EVAL_SYSTEM_PROMPT,
      prompt,
    });

    const unsupportedSentences = result.object.sentenceEvals
      .filter((item) => !item.supported)
      .map((item) => item.sentence);

    const pass = lengthOk && bannedHits.length === 0 && unsupportedSentences.length === 0;

    return {
      pass,
      length,
      lengthOk,
      bannedHits,
      unsupportedSentences,
    };
  } catch (error) {
    logger.error('Welcome message eval failed', error);
    return {
      pass: false,
      length,
      lengthOk,
      bannedHits,
      unsupportedSentences: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 통화 녹취록을 기반으로 AI 맞춤 환영 메시지를 생성합니다.
 */
export async function generateWelcomeMessage(
  input: WelcomeMessageInput
): Promise<WelcomeMessageResult> {
  const basePrompt = `
멤버 이름: ${input.memberName}

인터뷰 스크립트:
${input.callScript}

위 인터뷰 스크립트를 바탕으로 ${input.memberName}님을 위한 개인화된 환영 메시지를 작성해주세요.
메시지만 출력하세요 (다른 설명 없이).
`;

  let lastError = 'Unknown error';

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const userPrompt =
        attempt > 1
          ? `${basePrompt}\n주의: 이전 메시지가 검증에 실패했습니다. 통화 스크립트에 있는 정보만 사용하세요.`
          : basePrompt;

      const result = await generateText({
        model: google('gemini-3-flash-preview'),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
      });

      const message = result.text.trim();

      if (!message) {
        lastError = 'Generated message empty';
        logger.warn('AI generated empty welcome message', { attempt });
        continue;
      }

      const evalResult = await evaluateWelcomeMessage(input.callScript, message);

      if (!evalResult.pass) {
        lastError = 'Welcome message failed evaluation';
        logger.warn('Welcome message failed evaluation', {
          attempt,
          message, // Log the actual message
          length: evalResult.length,
          lengthOk: evalResult.lengthOk,
          bannedHits: evalResult.bannedHits,
          unsupportedSentences: evalResult.unsupportedSentences, // Log the array of unsupported sentences
          evalError: evalResult.error,
        });
        continue;
      }

      logger.info('Welcome message generated successfully', {
        memberName: input.memberName,
        messageLength: message.length,
        attempt,
      });

      return {
        success: true,
        message,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to generate welcome message', error);
    }
  }

  return {
    success: false,
    error: `${lastError} after ${MAX_GENERATION_ATTEMPTS} attempts`,
  };
}
