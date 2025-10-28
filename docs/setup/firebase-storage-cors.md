# Firebase Storage CORS 설정 가이드

**Last Updated**: 2025-10-28
**Category**: setup

## 개요

Firebase Storage에서 Vercel 프리뷰/스테이징 도메인으로 이미지를 fetch할 때 CORS 에러를 해결하기 위한 설정 가이드입니다.

## 문제 상황

- 독서 인증 임시저장 기능에서 Firebase Storage에 저장된 이미지를 불러올 때
- Vercel 프리뷰 도메인에서 `createFileFromUrl` 함수 실행 시 CORS 에러 발생
- 프로덕션에서는 정상 작동하지만 개발/프리뷰 환경에서만 문제 발생

## 해결 방법

### 1. CORS 설정 파일 준비

프로젝트 루트에 `cors.json` 파일 생성:

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "https://philipandsophy.com",
      "https://www.philipandsophy.com",
      "https://pslanding-*.vercel.app",
      "https://philipandsophy-*.vercel.app",
      "https://projectpns-*.vercel.app"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

**주의사항:**
- Firebase Storage는 와일드카드(`*`)를 지원하지 않음
- 각 Vercel 프리뷰 도메인을 개별적으로 추가해야 함
- 팀원들이 사용하는 프리뷰 도메인도 포함 필요

### 2. gsutil로 CORS 정책 적용

#### 방법 1: Google Cloud Shell 사용 (권장)

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 상단 터미널 아이콘 클릭하여 Cloud Shell 활성화
3. 프로젝트 설정:
   ```bash
   gcloud config set project philipandsophy
   ```

4. cors.json 파일 생성 (Cloud Shell에서 직접):
   ```bash
   cat > cors.json << 'EOF'
   [
     {
       "origin": [
         "http://localhost:3000",
         "https://philipandsophy.com",
         "https://www.philipandsophy.com",
         "https://pslanding-*.vercel.app",
         "https://philipandsophy-*.vercel.app",
         "https://projectpns-*.vercel.app"
       ],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF
   ```

5. CORS 정책 적용:
   ```bash
   gsutil cors set cors.json gs://philipandsophy.firebasestorage.app
   ```

#### 방법 2: 로컬 gsutil 사용

1. gsutil 설치 (macOS):
   ```bash
   brew install --cask google-cloud-sdk
   ```

2. 인증:
   ```bash
   gcloud auth login
   gcloud config set project philipandsophy
   ```

3. CORS 적용:
   ```bash
   gsutil cors set cors.json gs://philipandsophy.firebasestorage.app
   ```

### 3. 설정 확인

현재 CORS 설정 확인:
```bash
gsutil cors get gs://philipandsophy.firebasestorage.app
```

### 4. 반영 대기 및 테스트

- 설정 전파까지 약 5-10분 소요
- 브라우저 캐시 초기화 후 테스트
- 개발자 도구 Network 탭에서 CORS 헤더 확인

## 테스트 방법

1. Vercel 프리뷰 환경에서 독서 인증 페이지 접속
2. 임시저장된 이미지가 있는 상태에서 페이지 새로고침
3. 브라우저 콘솔에서 CORS 에러 없는지 확인
4. 이미지가 정상적으로 로드되는지 확인

## 추가 Vercel 도메인 등록

새로운 Vercel 프리뷰 도메인이 생성되면:

1. `cors.json`의 `origin` 배열에 도메인 추가
2. gsutil 명령으로 재적용
3. 기존 도메인은 영향받지 않음

## 보안 고려사항

- `cors.json`은 레포지토리에 커밋하지 않음 (`.gitignore`에 추가)
- 필요한 도메인만 최소한으로 추가
- 정기적으로 사용하지 않는 도메인 정리

## 트러블슈팅

### CORS 에러가 계속 발생하는 경우

1. 브라우저 캐시 완전 삭제
2. 시크릿 모드에서 테스트
3. 도메인이 정확히 일치하는지 확인 (프로토콜 포함)
4. Firebase Storage 버킷 이름 확인

### gsutil 권한 에러

```bash
# 권한 재설정
gcloud auth application-default login
gcloud auth login --update-adc
```

## 관련 코드

영향받는 주요 함수:
- `/src/lib/image-validation.ts` - `createFileFromUrl()`
- `/src/app/app/submit/step1/page.tsx` - 임시저장 이미지 로드

---

*이 문서는 Firebase Storage CORS 설정의 공식 가이드입니다.*