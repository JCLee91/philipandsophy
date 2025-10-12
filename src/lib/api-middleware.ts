import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { strictRateLimit } from '@/lib/rate-limit';
import type { Participant } from '@/types/database';

/**
 * 관리자 권한 + Rate Limit 검증 (통합 미들웨어)
 *
 * AI 매칭 등 민감한 관리자 작업에 사용
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const { user, error } = await requireAdminWithRateLimit(request);
 *   if (error) {
 *     return error;
 *   }
 *
 *   // ... 관리자 전용 API 로직 (user는 Participant 타입 보장)
 * }
 * ```
 */
export async function requireAdminWithRateLimit(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  // 1. 관리자 권한 검증
  const { user, error: authError } = await requireAdmin(request);
  if (authError) {
    return { user: null, error: authError };
  }

  // 2. Rate limiting (1분에 3회)
  const { error: rateLimitError } = await strictRateLimit(request, user!.id);
  if (rateLimitError) {
    return { user: null, error: rateLimitError };
  }

  return { user: user!, error: null };
}
