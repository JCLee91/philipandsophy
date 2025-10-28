import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';

// 환경 변수로 모델 선택
function getAIModel() {
  const provider = process.env.AI_PROVIDER || 'openai'; // 기본값: openai
  const modelName = process.env.AI_MODEL || 'gpt-4o-mini'; // 기본값: gpt-4o-mini

  switch (provider) {
    case 'anthropic':
      return anthropic(modelName);
    case 'google':
      return google(modelName);
    case 'openai':
    default:
      return openai(modelName);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const auth = await requireWebAppAdmin(req);
    if (auth.error) {
      return auth.error;
    }

    const { messages, dataContext } = await req.json();

    // System prompt
    const systemPrompt = `당신은 필립앤소피 독서 클럽의 데이터 분석 AI 어시스턴트입니다.

${dataContext || '⚠️ 데이터가 로드되지 않았습니다. 사용자에게 [새로고침] 버튼을 클릭하라고 안내하세요.'}

답변 규칙:
- 한국어로 자연스럽게 대화하듯이
- 기술 용어(필드명, 쿼리, 데이터베이스 등) 사용 금지
- 숫자는 정확하게
- 친절하고 간결하게
- 마치 사람과 대화하는 것처럼

예시:
❌ "cohortId가 1인 participants를 조회한 결과 22명입니다"
✅ "1기는 총 22명이 참여하고 있어요"`;

    const model = getAIModel();
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();

  } catch (error) {

    return new Response(JSON.stringify({ error: 'AI 채팅 중 오류가 발생했습니다' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
