# 📜 Scripts Guide

**Last Updated**: 2025-11-07

프로젝트의 모든 스크립트 사용 가이드입니다.

---

## 🎯 핵심 npm 스크립트 (15개)

### 개발 필수 (5개)
```bash
npm run dev          # 개발 서버 시작 (localhost:3000)
npm run build        # 프로덕션 빌드
npm start            # 프로덕션 서버 시작
npm run lint         # ESLint 실행
```

### 데이터 시딩 (4개)
```bash
npm run seed:cohorts      # 코호트 및 참가자 시드 데이터 생성
npm run seed:notices      # 공지사항 시드 데이터 생성
npm run seed:submissions  # 독서 인증 시드 데이터 생성
npm run seed:all          # 위 3개 모두 실행
```

### 긴급 복구 (2개)
```bash
npm run cleanup:dm                # DM 메시지 정리
npm run fix:duplicate-submissions # 중복 독서 인증 제거
```

### 통계 (2개)
```bash
npm run stats         # 전체 데이터베이스 통계
npm run stats:cohort1 # 코호트1 통계 생성
```

### 유틸리티 (2개)
```bash
npm run convert:webp         # 이미지를 WebP로 변환
npm run update:cohort-active # 코호트 활성화 상태 업데이트
```

---

## 🔧 직접 실행 스크립트

필요할 때만 `npx tsx` 명령어로 직접 실행합니다.

### 📊 데이터 체크 및 디버깅

```bash
# 사용자 데이터 확인
npx tsx src/scripts/check-user-data.ts

# 코호트 참가자 확인
npx tsx src/scripts/check-cohort-participants.ts

# 어제 독서 인증 확인
npx tsx src/scripts/check-yesterday-submissions.ts

# 독서 인증 수 디버깅
npx tsx src/scripts/debug-submission-count.ts

# 코호트별 참가자 디버깅
npx tsx src/scripts/debug-participants-by-cohort.ts

# 스토리지 폴더 확인
npx tsx src/scripts/check-storage-folders.ts

# 관리자 필드 확인
npx tsx src/scripts/check-admin-fields.ts

# 메시지 확인
npx tsx scripts/check-messages.ts

# 전체 메시지 목록
npx tsx scripts/list-all-messages.ts

# 푸시 알림 확인
npx tsx src/scripts/check-push-notifications.ts
```

### 🗑️ 데이터 정리 (Cleanup)

```bash
# 더미 데이터 정리
npx tsx src/scripts/cleanup-dummy-data.ts

# 프로덕션 정리
npx tsx src/scripts/production-cleanup.ts

# 사용되지 않는 프로필 정리
npx tsx src/scripts/delete-unused-profiles-folder.ts

# 레거시 푸시 필드 정리
npx tsx scripts/remove-legacy-push-fields.ts

# 푸시 토큰 정리
npx tsx scripts/cleanup-push-tokens.ts
```

### 🔄 데이터 리셋

```bash
# 사용자 독서 인증 리셋
npx tsx src/scripts/reset-user-submissions.ts

# 모든 푸시 토큰 리셋
npx tsx scripts/reset-all-push-tokens.ts

# 관리자 푸시 토큰 리셋
npx tsx scripts/reset-admin-push-tokens.ts
```

### 🛠️ 데이터 수정 (Fix/Update)

```bash
# 어제 책 정보 수정
npx tsx src/scripts/fix-yesterday-books.ts

# 관리자 필드 수정
npx tsx src/scripts/fix-admin-fields.ts

# 프로필 이미지 일괄 업데이트
npx tsx src/scripts/update-all-profile-images.ts

# 직업 정보 업데이트
npx tsx src/scripts/update-all-occupations.ts

# 관리자를 administrator로 업데이트
npx tsx src/scripts/update-admin-to-administrator.ts

# 프로필 일괄 업데이트
npx tsx src/scripts/batch-update-profiles.ts

# 백데이트 독서 인증 추가
npx tsx src/scripts/add-backdated-submission.ts

# 다진 프로필 업데이트
npx tsx src/scripts/update-dajin-profile.ts

# 다진 서클 복원
npx tsx src/scripts/restore-dajin-circle.ts
```

### 🌱 추가 시딩

```bash
# 관리자 시드 데이터
npx tsx src/scripts/seed-admin.ts

# 실제 사용자 추가
npx tsx src/scripts/add-real-users.ts

# 공지사항 템플릿 시드
npx tsx src/scripts/seed-notice-templates.ts

# 데일리 질문 시드
npx tsx src/scripts/seed-daily-questions.ts
```

### 🖼️ 이미지 처리

```bash
# 프로필 이미지 WebP 변환
npx tsx src/scripts/convert-profiles-to-webp.ts

# 프로필 이미지 WebP 확인
npx tsx src/scripts/verify-profile-images-webp.ts

# 코호트2 이미지 업로드
npx tsx scripts/upload-cohort2-images.ts

# 양권 프로필 업로드
npx tsx scripts/upload-yanggwon-profile.ts
```

### 📥 데이터 임포트

```bash
# CSV에서 성별 정보 임포트
npx tsx src/scripts/import-gender-from-csv.ts
```

### 🤝 매칭 시스템 (Legacy)

```bash
# 데일리 매칭 생성 (레거시)
npx tsx src/scripts/generate-daily-matching.ts

# AI 매칭 테스트
npx tsx src/scripts/test-ai-matching.ts

# 매칭 삭제
npx tsx src/scripts/delete-matching.ts
```

### 🔐 Firebase 인증 및 권한

```bash
# Firebase 전화번호 인증 마이그레이션
npx tsx src/scripts/migrate-users-to-firebase-phone-auth.ts

# Firebase UID 연결 확인
npx tsx src/scripts/verify-firebase-uid-linking.ts

# 관리자 클레임 설정
npx tsx scripts/set-admin-claims.ts

# 관리자 클레임 확인
npx tsx scripts/verify-admin-claims.ts

# FirebaseUID 연결 확인
npx tsx scripts/verify-firebaseuid-linking.ts

# 전화번호 사용자 추가
npx tsx scripts/register-phone-user.ts
```

### 🔔 푸시 알림 테스트

```bash
# 푸시 시스템 테스트
npx tsx scripts/test-push-notifications.ts

# 관리자에게 테스트 푸시 전송
npx tsx scripts/send-test-push-to-admin.ts
```

### 📊 특수 통계

```bash
# 특수 랭킹 생성
npx tsx scripts/generate-special-rankings.ts

# Firestore 스모크 테스트
npx tsx scripts/stage2-firestore-smoke.ts
```

---

## 📂 스크립트 파일 위치

- `src/scripts/` - 메인 스크립트 (대부분)
- `scripts/` - 루트 레벨 스크립트 (일부)
- `scripts/archive/` - 보관된 레거시 스크립트 (실행 불필요)

---

## 💡 사용 팁

1. **스크립트 실행 전 확인**
   - 프로덕션 데이터베이스인지 확인
   - 백업 필요 여부 판단

2. **자주 쓰는 명령어만 npm scripts에 등록**
   - 현재 15개로 정리됨
   - 나머지는 필요할 때 `npx tsx` 직접 실행

3. **Firebase Admin SDK 사용**
   - 모든 스크립트는 Firebase Admin SDK 사용
   - `.env.local`에 Firebase 설정 필요

4. **디버깅**
   ```bash
   # 실행 전 코드 확인
   cat src/scripts/[스크립트명].ts

   # 실행 로그 확인
   npx tsx src/scripts/[스크립트명].ts 2>&1 | tee logs.txt
   ```

---

## ⚠️ 주의사항

- ❌ **프로덕션 환경에서 cleanup 스크립트 신중히 사용**
- ❌ **reset 스크립트는 데이터 완전 삭제 가능**
- ✅ **테스트 환경에서 먼저 실행 권장**
- ✅ **중요 데이터는 백업 후 실행**

---

**문의**: 스크립트 관련 문제는 프로젝트 관리자에게 문의하세요.
