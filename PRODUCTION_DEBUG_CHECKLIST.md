# 프로덕션 매칭 문제 디버깅 체크리스트

## 1. Vercel 환경 변수 확인

### 필수 환경 변수
프로덕션 환경에서 다음 환경 변수가 설정되어 있는지 확인:

```bash
# Vercel Dashboard → Settings → Environment Variables

# AI 제공자 설정 (개발과 동일하게)
AI_PROVIDER=google
AI_MODEL=gemini-2.5-flash

# Google AI API 키
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# 또는 OpenAI 사용 시
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=your_openai_api_key
```

### 확인 방법
1. Vercel Dashboard 접속
2. 프로젝트 선택 → Settings → Environment Variables
3. 위 변수들이 Production 환경에 설정되어 있는지 확인
4. 누락된 변수 추가 후 **재배포 필요**

---

## 2. 프로덕션 로그 확인

### Vercel 함수 로그 보는 법
```bash
# Vercel CLI 사용
vercel logs --follow

# 또는 Vercel Dashboard
Dashboard → Deployments → 최신 배포 → Functions → 로그 확인
```

### 확인할 로그
- `[ERROR]` AI 매칭 실행 실패 - 구체적 오류 메시지
- `[WARN]` AI 매칭 검증 실패 - 검증 에러 목록
- API 타임아웃 오류 (10s 초과)
- AI API 키 오류 (401/403)

---

## 3. 타임아웃 문제 해결

### 현재 상황
- Vercel Hobby Plan: 함수 최대 10초
- Vercel Pro Plan: 함수 최대 60초
- AI 매칭은 참가자 수에 따라 5-30초 소요

### 해결 방법

#### Option 1: vercel.json에 타임아웃 설정 추가
```json
{
  "functions": {
    "src/app/api/admin/matching/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/admin/matching/preview/route.ts": {
      "maxDuration": 60
    }
  }
}
```

#### Option 2: Vercel Pro 플랜으로 업그레이드

---

## 4. AI 모델별 문제 진단

### Gemini vs GPT-4o-mini 차이

| 항목 | Gemini 2.5 Flash | GPT-4o-mini |
|------|------------------|-------------|
| JSON 생성 | 매우 정확 | 가끔 불완전 |
| 속도 | 빠름 (3-5초) | 보통 (5-10초) |
| 비용 | 무료/저렴 | 유료 |

### 권장 사항
- **개발과 동일하게 Gemini 사용 권장**
- Vercel에 Google API 키 추가 필요

---

## 5. 실시간 디버깅 추가

### API 응답에 디버그 정보 추가
프로덕션에서 문제 발생 시 자세한 정보를 얻기 위해:

```typescript
// src/app/api/admin/matching/preview/route.ts
return NextResponse.json({
  success: true,
  preview: true,
  matching: { assignments: matching.assignments },
  validation: matching.validation,
  debug: {
    provider: process.env.AI_PROVIDER || 'openai',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    participantCount: participantAnswers.length,
    timestamp: new Date().toISOString(),
  },
  // ... 기존 필드들
});
```

---

## 6. 빠른 확인 방법

### 현재 프로덕션 환경 변수 확인 API
```typescript
// src/app/api/debug/env/route.ts
export async function GET() {
  return Response.json({
    aiProvider: process.env.AI_PROVIDER || 'not set',
    aiModel: process.env.AI_MODEL || 'not set',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasGoogleKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
}
```

접속: `https://your-domain.vercel.app/api/debug/env`

---

## 7. 가장 가능성 높은 원인

### 🔥 1순위: 환경 변수 미설정
- Vercel에 `GOOGLE_GENERATIVE_AI_API_KEY` 없음
- 기본값으로 OpenAI 사용 중 → OpenAI 키도 없거나 오류

### 🔥 2순위: 타임아웃
- AI 매칭이 10초 넘게 걸림
- Vercel Hobby Plan 제한에 걸림

### 🔥 3순위: 모델 응답 형식 차이
- OpenAI가 불완전한 JSON 반환
- 검증 실패로 이어짐

---

## 8. 즉시 조치 사항

1. **Vercel 환경 변수 추가**
   ```bash
   vercel env add AI_PROVIDER production
   # 값 입력: google

   vercel env add AI_MODEL production
   # 값 입력: gemini-2.5-flash

   vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
   # 값 입력: [Google Cloud Console에서 발급받은 API 키]
   ```

2. **재배포**
   ```bash
   git push
   # 또는 Vercel Dashboard에서 Redeploy
   ```

3. **로그 확인**
   ```bash
   vercel logs --follow
   ```

4. **매칭 테스트**
   - 프로덕션에서 매칭 프리뷰 실행
   - 에러 메시지 확인

---

## 9. 긴급 우회 방안

### 만약 계속 실패한다면
- 개발 환경에서 매칭 실행
- 결과를 JSON으로 export
- Firebase Console에서 수동으로 dailyFeaturedParticipants 업데이트

---

## 연락처
문제 해결 안되면 Vercel 로그 스크린샷과 함께 문의
