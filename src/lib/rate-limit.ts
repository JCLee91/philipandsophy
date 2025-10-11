import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate Limiting 설정
 */
interface RateLimitConfig {
  /**
   * 시간 윈도우 (밀리초)
   * @default 60000 (1분)
   */
  windowMs?: number;
  /**
   * 시간 윈도우 내 최대 요청 수
   * @default 10
   */
  max?: number;
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
 * Rate limit 저장소 (메모리 기반)
 *
 * ⚠️ CRITICAL WARNING: 메모리 기반 rate limiting은 Vercel/Netlify 등
 * serverless 환경에서 작동하지 않습니다. 각 요청마다 새로운 인스턴스가
 * 생성되어 rate limit이 전혀 적용되지 않습니다.
 *
 * 프로덕션 배포 전 필수 조치:
 * 1. Upstash Redis 설정 (https://upstash.com)
 * 2. @upstash/ratelimit 패키지 설치: npm install @upstash/ratelimit @upstash/redis
 * 3. 환경 변수 설정:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 * 4. 이 파일을 Redis 기반으로 교체
 *
 * 참고: docs/setup/upstash-redis.md
 */
const rateLimitStore = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

/**
 * Rate limit 저장소 정리 (메모리 누수 방지)
 * 1시간 주기로 만료된 항목 삭제
 *
 * ⚠️ WARNING: Serverless 환경에서는 이 setInterval이 실행되지 않습니다.
 */
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetTime < now) {
          rateLimitStore.delete(key);
        }
      }
    },
    60 * 60 * 1000
  ); // 1시간마다 정리
}

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
 * Rate Limiting 미들웨어
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   // Rate limit 체크 (1분에 5회)
 *   const rateLimitResult = await rateLimit(request, {
 *     windowMs: 60000,
 *     max: 5,
 *     message: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도하세요.'
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
    windowMs = 60000, // 1분
    max = 10, // 10회
    keyGenerator = defaultKeyGenerator,
    message = '요청 제한을 초과했습니다. 잠시 후 다시 시도하세요.',
  } = config;

  const key = keyGenerator(request);
  const now = Date.now();

  // 기존 Rate limit 정보 조회
  const existing = rateLimitStore.get(key);

  if (existing) {
    // 시간 윈도우가 지났으면 리셋
    if (existing.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { error: null, remaining: max - 1 };
    }

    // 제한 초과 체크
    if (existing.count >= max) {
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
              'X-RateLimit-Limit': max.toString(),
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
    rateLimitStore.set(key, existing);

    return { error: null, remaining: max - existing.count };
  }

  // 첫 요청
  rateLimitStore.set(key, {
    count: 1,
    resetTime: now + windowMs,
  });

  return { error: null, remaining: max - 1 };
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
    windowMs: 60000, // 1분
    max: 3, // 3회만 허용
    keyGenerator: userId
      ? rateLimitByUser(userId)
      : defaultKeyGenerator,
    message: 'AI 매칭은 1분에 3회까지만 실행할 수 있습니다.',
  });

/**
 * 일반 Rate limit (일반 API용)
 */
export const standardRateLimit = (request: NextRequest) =>
  rateLimit(request, {
    windowMs: 60000, // 1분
    max: 20, // 20회
    message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  });
