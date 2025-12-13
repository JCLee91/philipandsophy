# Firebase 보안 규칙 빠른 시작 가이드

**Last Updated**: 2025-12-13
**Category**: setup

## Overview

MVP를 위한 간결한 Firebase 보안 규칙 설정 가이드입니다.

## 전제 조건

보안 규칙은 **Custom Claims 기반**입니다:
- 관리자는 `request.auth.token.admin == true` 필요
- 일반 사용자는 인증만 필요 (`request.auth != null`)

## 1단계: 보안 규칙 배포

```bash
# Firestore + Storage 규칙 배포
firebase deploy --only firestore:rules,storage:rules

# 개별 배포
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## 2단계: 관리자 Custom Claims 설정

### 방법 1: Admin SDK로 설정 (권장)

Custom Claims 설정은 Admin SDK가 필요합니다. 상세 절차는 다음 문서를 참고하세요:

- `docs/setup/firebase-custom-claims.md`

### 방법 2: Firebase Console (수동)

Firebase Console에서는 Custom Claims를 직접 설정할 수 없으므로, Admin SDK를 사용해야 합니다.

## 3단계: 클라이언트에서 토큰 새로고침

Custom Claims 설정 후 클라이언트에서 토큰을 새로고침해야 합니다:

```typescript
// 토큰 새로고침 (강제)
await auth.currentUser?.getIdToken(true);

// Claims 확인
const idTokenResult = await auth.currentUser?.getIdTokenResult();
console.log('Admin?', idTokenResult?.claims?.admin === true);
```

**중요**: Custom Claims는 최대 1시간 후에 자동 반영되지만, 즉시 적용하려면 토큰을 새로고침해야 합니다.

## 보안 규칙 구조

### Firestore Rules

```javascript
// Helper Functions
function isSignedIn() {
  return request.auth != null;
}

function isAdminClaim() {
  return isSignedIn() && request.auth.token.admin == true;
}

function isOwnParticipant(participantId) {
  return exists(/databases/$(database)/documents/participants/$(participantId)) &&
         get(/databases/$(database)/documents/participants/$(participantId)).data.firebaseUid == request.auth.uid;
}

// 적용 예시
match /notices/{noticeId} {
  allow read: if isSignedIn();        // 로그인한 모든 사용자
  allow write: if isAdminClaim();     // 관리자만
}

match /reading_submissions/{id} {
  allow read: if isSignedIn();
  allow create: if isOwnParticipant(request.resource.data.participantId);  // 본인만
  allow update, delete: if isOwnParticipant(resource.data.participantId);  // 본인만
}
```

### Storage Rules

```javascript
// 공지사항 이미지
match /notices/{cohortId}/{fileName} {
  allow read: if isSignedIn();
  allow create, update: if isAdminClaim() && isValidImage() && isUnder10MB();
  allow delete: if isAdminClaim();
}

// 프로필 이미지
match /profiles/{userId}/{fileName} {
  allow read: if isSignedIn();
  allow create, update: if isSignedIn() && isValidImage() && isUnder50MB();
  allow delete: if isSignedIn();
}
```

## 테스트

### 로컬 테스트 (권장)

```bash
# Firebase 에뮬레이터 시작
firebase emulators:start --only firestore,storage

# 테스트 시나리오
# 1. 비로그인 사용자: 모든 쓰기 차단
# 2. 일반 사용자: 본인 데이터만 수정 가능
# 3. 관리자: 공지사항 작성 가능
```

### 프로덕션 확인

```bash
# Firestore 규칙 확인
firebase firestore:rules --project philipandsophy

# Storage 규칙 확인
firebase storage:rules --project philipandsophy
```

## 문제 해결

### 관리자가 공지를 작성할 수 없어요

1. Custom Claims 확인:
   ```typescript
   const token = await auth.currentUser?.getIdTokenResult();
   console.log(token?.claims?.admin); // true여야 함
   ```

2. Claims가 없으면 스크립트 실행:
   ```bash
   # docs/setup/firebase-custom-claims.md 참고 (Admin SDK로 claims 설정)
   ```

3. 토큰 새로고침:
   ```typescript
   await auth.currentUser?.getIdToken(true);
   ```

### 일반 사용자가 본인 데이터를 수정할 수 없어요

1. `firebaseUid` 필드 확인:
   - Participant 문서에 `firebaseUid` 필드가 있는지 확인
   - 값이 Firebase Auth UID와 일치하는지 확인

2. 허용된 필드만 수정:
   ```javascript
   // 허용: name, profileImage, bio, occupation 등
   // 차단: firebaseUid, cohortId, isAdministrator
   ```

### 보안 규칙 배포가 실패해요

```bash
# 문법 검증
firebase deploy --only firestore:rules --dry-run

# 오류 메시지 확인
firebase deploy --only firestore:rules --debug
```

## 다음 단계

1. **Firebase Functions 추가** (선택)
   - 전화번호 인증 시 자동 admin claim 설정
   - Participant 문서 업데이트 시 claim 동기화

2. **감사 로그** (선택)
   - 관리자 권한 변경 이력 기록
   - Cloud Functions로 구현

3. **역할 세분화** (향후)
   - moderator, editor 등 추가 역할
   - 더 세밀한 권한 제어

---
*Custom Claims 설정 상세 가이드는 [firebase-custom-claims.md](./firebase-custom-claims.md)를 참고하세요.*
