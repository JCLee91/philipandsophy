# 🚨 긴급 보안 조치 필요

## 발견된 보안 이슈

서비스 계정 키 파일(`firebase-service-account.json`)이 로컬에 노출되어 있습니다.

## 즉시 조치 사항

### 1. GCP 콘솔에서 서비스 계정 키 폐기

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택: `philipandsophy`
3. **IAM & Admin > Service Accounts** 이동
4. 서비스 계정 찾기: `firebase-adminsdk-fbsvc@philipandsophy.iam.gserviceaccount.com`
5. **Keys** 탭 클릭
6. 키 ID `0ffa64636b0ea89d1c51b75e3d9c6eb98c5b0bc6` 찾아서 **삭제**

### 2. 새 서비스 계정 키 생성 (선택사항)

로컬 개발용으로 새 키가 필요한 경우:

1. 같은 서비스 계정에서 **Add Key > Create New Key** 클릭
2. **JSON** 형식 선택
3. 다운로드된 파일을 **안전한 위치에 보관** (절대 Git에 커밋하지 말 것)
4. 파일을 프로젝트 루트에 `firebase-service-account.json`로 저장 (이미 `.gitignore`에 포함됨)

### 3. Vercel 환경 변수 설정

프로덕션 배포에서는 파일 대신 환경 변수 사용:

1. [Vercel Dashboard](https://vercel.com/) > 프로젝트 선택
2. **Settings > Environment Variables** 이동
3. 다음 변수 추가:
   ```
   FIREBASE_PROJECT_ID=philipandsophy
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@philipandsophy.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=[새 키의 private_key 값]
   ```

**주의**: `FIREBASE_PRIVATE_KEY`는 따옴표 없이 전체 내용 복사 (`-----BEGIN PRIVATE KEY-----` 부터 `-----END PRIVATE KEY-----` 까지)

### 4. 로컬 파일 삭제

```bash
cd /Users/jclee/Desktop/휠즈랩스/projectpns
rm firebase-service-account.json
```

## 변경 사항

코드가 다음과 같이 업데이트되었습니다:

- ✅ Firebase Admin SDK 초기화 시 환경 변수 우선 사용
- ✅ 로컬 개발 시에만 `firebase-service-account.json` 파일 사용 (fallback)
- ✅ `.gitignore`에 이미 `firebase-service-account.json` 포함되어 커밋 방지

## 확인 사항

- [ ] GCP 콘솔에서 기존 키 삭제 완료
- [ ] Vercel 환경 변수 설정 완료
- [ ] 로컬에서 새 키 다운로드 및 저장 (선택)
- [ ] 로컬에서 기존 `firebase-service-account.json` 삭제
- [ ] 배포 후 Firebase Admin 기능 정상 작동 확인

---

**생성일**: 2025-10-18
**우선순위**: 🔴 긴급
