# Upstash Redis Rate Limiting 설정

**Last Updated**: 2025-10-11
**Category**: setup

## Overview

현재 프로젝트는 메모리 기반 rate limiting을 사용하고 있어 **Vercel serverless 환경에서 작동하지 않습니다**. 프로덕션 배포 전에 Upstash Redis로 전환이 필수입니다.

## 왜 Upstash Redis인가?

### 현재 문제점
- **메모리 기반**: 각 요청마다 새로운 서버리스 함수 인스턴스 생성
- **상태 공유 불가**: Map 데이터가 요청 간 공유되지 않음
- **Rate limit 무력화**: 사용자가 무제한 요청 가능

### Upstash Redis 장점
- **Serverless 최적화**: REST API로 연결 (connection pool 불필요)
- **Edge 지원**: 전 세계 여러 리전에서 낮은 지연시간
- **Pay-per-request**: 사용한 만큼만 과금 (무료 티어: 10,000 requests/day)
- **공식 라이브러리**: `@upstash/ratelimit` 제공

---

## 1. Upstash 계정 생성

1. [Upstash 회원가입](https://console.upstash.com/login)
2. **Create Database** 클릭
3. 설정:
   - **Name**: `projectpns-ratelimit`
   - **Type**: Regional (Edge는 유료)
   - **Region**: Asia Pacific (Seoul) 또는 가장 가까운 지역
   - **TLS**: Enabled (보안 강화)

4. 데이터베이스 생성 후 **REST API** 탭에서 다음 정보 복사:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXXXxxxXXX...
   ```

---

## 2. 패키지 설치

```bash
npm install @upstash/ratelimit @upstash/redis
```

**설치되는 패키지**:
- `@upstash/ratelimit`: Rate limiting 로직
- `@upstash/redis`: Redis REST client

---

## 3. 환경 변수 설정

### 로컬 개발 (`.env.local`)

```env
# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxxXXX...
```

### Vercel 배포

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. 두 개의 환경 변수 추가:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. **Production**, **Preview**, **Development** 모두 체크

---

## 4. Redis 기반 Rate Limiter 구현

기존 `src/lib/rate-limit.ts` 파일을 아래 코드로 교체:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Redis 클라이언트 초기화
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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
 * 기본 키 생성기: IP 주소 추출
 */
function defaultKeyGenerator(request: NextRequest): string {
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

  // Sliding window 알고리즘 사용
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${window} s`),
    analytics: true, // Upstash 대시보드에서 통계 확인 가능
    prefix: 'projectpns', // Redis key prefix
  });

  const identifier = keyGenerator(request);
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

/**
 * IP + 사용자 ID 기반 Rate limiting
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
    limit: 3,
    keyGenerator: userId ? rateLimitByUser(userId) : defaultKeyGenerator,
    message: 'AI 매칭은 1분에 3회까지만 실행할 수 있습니다.',
  });

/**
 * 일반 Rate limit (일반 API용)
 */
export const standardRateLimit = (request: NextRequest) =>
  rateLimit(request, {
    window: 60, // 1분
    limit: 20,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  });
```

---

## 5. 동작 확인

### 로컬 테스트

1. 개발 서버 시작:
   ```bash
   npm run dev
   ```

2. API 반복 호출 (Bash):
   ```bash
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/admin/matching \
       -H "Content-Type: application/json" \
       -d '{"cohortId":"1"}' \
       -H "Authorization: Bearer YOUR_TOKEN"
     echo ""
   done
   ```

3. 4번째 요청부터 429 에러 확인:
   ```json
   {
     "error": "AI 매칭은 1분에 3회까지만 실행할 수 있습니다.",
     "retryAfter": 57
   }
   ```

### Upstash 대시보드 확인

1. [Upstash Console](https://console.upstash.com) → 데이터베이스 선택
2. **Data Browser** 탭:
   - Key 형식: `projectpns:192.168.1.1` (IP 주소)
   - TTL (Time To Live): 60초 자동 만료
3. **Analytics** 탭:
   - 요청 수, 성공/실패율 그래프 확인

---

## 6. 비용 계산

### 무료 티어 (Free Plan)
- **10,000 requests/day** (월 300,000 requests)
- **100MB 데이터**
- **1 database**

### 예상 사용량 (프로젝트 기준)
- 일일 활성 사용자: 100명
- 사용자당 평균 API 호출: 50회/일
- **총 요청 수**: 5,000 requests/day

**결론**: 무료 티어로 충분 (50% 여유)

### Pro Plan (필요 시)
- **$0.2 per 100,000 requests**
- 추가 데이터베이스
- Multi-region replication

---

## 7. 트러블슈팅

### 에러: "UPSTASH_REDIS_REST_URL is not defined"

**원인**: 환경 변수 미설정

**해결**:
1. `.env.local` 파일 확인
2. Vercel 환경 변수 확인
3. 재배포: `vercel --prod`

### Redis 연결 실패

**확인 사항**:
1. Upstash 데이터베이스 상태 (Active인지)
2. REST API URL 정확한지 (https:// 포함)
3. Token에 공백 없는지

### Rate limit이 작동하지 않음

**원인**: 로컬 개발 환경에서 IP가 `::1` 또는 `localhost`

**해결**:
```typescript
// src/lib/rate-limit.ts에 추가
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  // 로컬 개발 환경에서는 고정 IP 사용
  if (process.env.NODE_ENV === 'development') {
    return 'dev-machine';
  }

  return realIp || forwarded?.split(',')[0] || 'unknown';
}
```

---

## 8. 마이그레이션 체크리스트

배포 전 확인:

- [ ] Upstash 계정 생성 완료
- [ ] Redis 데이터베이스 생성 (Seoul region)
- [ ] `@upstash/ratelimit`, `@upstash/redis` 패키지 설치
- [ ] `.env.local`에 환경 변수 추가
- [ ] Vercel 환경 변수 설정 (Production/Preview)
- [ ] `src/lib/rate-limit.ts` 파일 교체
- [ ] 로컬 테스트 통과 (10회 연속 호출)
- [ ] Vercel 재배포 완료
- [ ] 프로덕션 환경 rate limit 동작 확인

---

## 참고 자료

- [Upstash Documentation](https://docs.upstash.com/redis)
- [@upstash/ratelimit GitHub](https://github.com/upstash/ratelimit)
- [Vercel Edge Config vs Redis](https://vercel.com/docs/storage/edge-config)
- [Rate Limiting 알고리즘 비교](https://blog.upstash.com/rate-limiting-algorithms)

---

*이 문서는 Upstash Redis rate limiting 설정의 유일한 공식 가이드입니다.*
