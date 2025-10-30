/**
 * 환경 변수 디버깅 API
 *
 * @description 프로덕션 환경에서 AI 설정을 확인하기 위한 디버깅 엔드포인트
 * @route GET /api/debug/env
 *
 * @example
 * ```bash
 * curl https://your-domain.vercel.app/api/debug/env
 * ```
 */

export async function GET() {
  return Response.json({
    aiProvider: process.env.AI_PROVIDER || 'not set',
    aiModel: process.env.AI_MODEL || 'not set',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasGoogleKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
