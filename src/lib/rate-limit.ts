import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate Limiting 설정
 */
interface RateLimitConfig {
  /**
   * 시간 윈도우 (초)
   * @default 60 (1분)
   */
  window?: number;
  /**
   * 시간 윈도우 내 최대 요청 수
   * @default 10
   */
  limit?: number;
  /**
   * 고유 식별자 추출 함수
   * @default IP 주소
   */
  keyGenerator?: (request: NextRequest) => string;
  /**
   * Rate limit 초과 시 응답 메시지
   */
  message?: string;
}

/**
 * Redis 클라이언트 초기화
 * 환경 변수가 없을 경우 개발 모드로 폴백 (메모리 기반)
 */
let redis: Redis | null = null;
let isDevelopmentMode = false;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else {
    console.warn('⚠️ Upstash Redis 환경 변수가 설정되지 않았습니다. 개발 모드로 실행됩니다.');
    console.warn('프로덕션 배포 전에 UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN을 설정하세요.');
    isDevelopmentMode = true;
  }
} catch (error) {
  console.error('Redis 초기화 실패:', error);
  isDevelopmentMode = true;
}

/**
 * 개발 모드용 메모리 저장소 (Redis 없을 때만 사용)
 */
const devRateLimitStore = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

/**
 * 기본 키 생성기: IP 주소 추출
 */
function defaultKeyGenerator(request: NextRequest): string {
  // Vercel/Cloudflare 등에서 실제 IP 추출
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown';
}

/**
 * Rate Limiting 미들웨어 (Upstash Redis 기반)
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, {
 *     window: 60, // 1분
 *     limit: 5,
 *     message: '너무 많은 요청을 보냈습니다.'
 *   });
 *
 *   if (rateLimitResult.error) {
 *     return rateLimitResult.error;
 *   }
 *
 *   // ... API 로직
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {}
): Promise<{ error: NextResponse | null; remaining: number }> {
  const {
    window = 60, // 1분 (초 단위)
    limit = 10,
    keyGenerator = defaultKeyGenerator,
    message = '요청 제한을 초과했습니다. 잠시 후 다시 시도하세요.',
  } = config;

  const identifier = keyGenerator(request);

  // Redis가 설정된 경우
  if (redis && !isDevelopmentMode) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${window} s`),
      analytics: true,
      prefix: 'projectpns',
    });

    const { success, limit: maxLimit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);

      return {
        error: NextResponse.json(
          {
            error: message,
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': maxLimit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(reset).toISOString(),
            },
          }
        ),
        remaining: 0,
      };
    }

    return { error: null, remaining };
  }

  // 개발 모드: 메모리 기반 폴백
  const now = Date.now();
  const windowMs = window * 1000;
  const existing = devRateLimitStore.get(identifier);

  if (existing) {
    // 시간 윈도우가 지났으면 리셋
    if (existing.resetTime < now) {
      devRateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { error: null, remaining: limit - 1 };
    }

    // 제한 초과 체크
    if (existing.count >= limit) {
      const retryAfter = Math.ceil((existing.resetTime - now) / 1000);

      return {
        error: NextResponse.json(
          {
            error: message,
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(existing.resetTime).toISOString(),
            },
          }
        ),
        remaining: 0,
      };
    }

    // 카운트 증가
    existing.count += 1;
    devRateLimitStore.set(identifier, existing);

    return { error: null, remaining: limit - existing.count };
  }

  // 첫 요청
  devRateLimitStore.set(identifier, {
    count: 1,
    resetTime: now + windowMs,
  });

  return { error: null, remaining: limit - 1 };
}

/**
 * IP + 사용자 ID 기반 Rate limiting
 * 로그인한 사용자에게 더 세밀한 제어
 */
export function rateLimitByUser(userId: string) {
  return (request: NextRequest) => {
    const ip = defaultKeyGenerator(request);
    return `${ip}:${userId}`;
  };
}

/**
 * 엄격한 Rate limit (민감한 작업용)
 * 예: AI 매칭, 파일 업로드
 */
export const strictRateLimit = (request: NextRequest, userId?: string) =>
  rateLimit(request, {
    window: 60, // 1분
    limit: 3, // 3회만 허용
    keyGenerator: userId ? rateLimitByUser(userId) : defaultKeyGenerator,
    message: 'AI 매칭은 1분에 3회까지만 실행할 수 있습니다.',
  });

/**
 * 일반 Rate limit (일반 API용)
 */
export const standardRateLimit = (request: NextRequest) =>
  rateLimit(request, {
    window: 60, // 1분
    limit: 20, // 20회
    message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  });
