# Firebase Custom Claims 설정 가이드

**Last Updated**: 2025-10-16
**Category**: setup

## Overview

Firebase Custom Claims를 사용한 관리자 권한 설정 방법입니다. 이를 통해 보안 규칙에서 효율적으로 관리자를 확인할 수 있습니다.

## 현재 상황

### 임시 방안 (현재 사용 중)
- Firestore Rules: 알려진 participant 문서 ID (admin, admin2, admin3) 직접 확인
- Storage Rules: 알려진 Firebase UID 하드코딩 (교체 필요)

### 문제점
- 새 관리자 추가 시 규칙 재배포 필요
- 문서 ID 변경 시 관리 기능 무력화
- 성능 저하 (매번 3개 문서 조회)

## Firebase Functions로 Custom Claims 설정

### 1. Firebase Functions 초기화

```bash
firebase init functions
npm install firebase-admin firebase-functions
```

### 2. 관리자 설정 함수 작성

`functions/src/admin/setAdminClaim.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 사용자를 관리자로 설정하는 HTTP 함수
 * 보안: 이 함수는 반드시 인증된 관리자만 호출할 수 있도록 보호해야 함
 */
export const setAdminClaim = functions.https.onCall(async (data, context) => {
  // 호출자가 관리자인지 확인
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can set admin claims'
    );
  }

  const { uid, isAdmin } = data;

  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'uid is required'
    );
  }

  try {
    // Custom Claims 설정
    await admin.auth().setCustomUserClaims(uid, {
      admin: isAdmin === true
    });

    return {
      success: true,
      message: `Admin claim ${isAdmin ? 'added' : 'removed'} for user ${uid}`
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Failed to set custom claims',
      error
    );
  }
});
```

### 3. 전화번호 인증 시 자동 관리자 확인

`functions/src/triggers/onUserCreate.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const ADMIN_PHONE_NUMBERS = [
  '+821000000001',  // admin
  '+821042633467',  // admin2 (문준영)
  '+821042627615',  // admin3 (김현지)
];

/**
 * 새 사용자 생성 시 관리자 여부 자동 설정
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const phoneNumber = user.phoneNumber;

  if (!phoneNumber) {
    return null;
  }

  // 관리자 전화번호인지 확인
  if (ADMIN_PHONE_NUMBERS.includes(phoneNumber)) {
    try {
      // Custom Claims 설정
      await admin.auth().setCustomUserClaims(user.uid, {
        admin: true
      });

      console.log(`Admin claim set for user ${user.uid} (${phoneNumber})`);
    } catch (error) {
      console.error(`Failed to set admin claim for ${user.uid}:`, error);
    }
  }

  return null;
});
```

### 4. Participant 문서와 동기화

`functions/src/triggers/onParticipantUpdate.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Participant 문서의 isAdministrator 필드 변경 시 Custom Claims 동기화
 */
export const onParticipantUpdate = functions.firestore
  .document('participants/{participantId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // isAdministrator 필드가 변경되었는지 확인
    if (before.isAdministrator === after.isAdministrator) {
      return null;
    }

    const firebaseUid = after.firebaseUid;
    if (!firebaseUid) {
      return null;
    }

    try {
      // Custom Claims 업데이트
      await admin.auth().setCustomUserClaims(firebaseUid, {
        admin: after.isAdministrator === true
      });

      console.log(
        `Admin claim ${after.isAdministrator ? 'added' : 'removed'} for ${firebaseUid}`
      );
    } catch (error) {
      console.error(`Failed to update admin claim for ${firebaseUid}:`, error);
    }

    return null;
  });
```

## 보안 규칙에서 사용

### Firestore Rules

```javascript
function isAdmin() {
  return isSignedIn() && request.auth.token.admin == true;
}
```

### Storage Rules

```javascript
function isAdmin() {
  return isSignedIn() && request.auth.token.admin == true;
}
```

## 클라이언트에서 확인

```typescript
// Firebase Auth 사용자 토큰 새로고침
await auth.currentUser?.getIdToken(true);

// Custom Claims 확인
const idTokenResult = await auth.currentUser?.getIdTokenResult();
const isAdmin = idTokenResult?.claims?.admin === true;
```

## 배포

```bash
# Functions 배포
firebase deploy --only functions

# 특정 함수만 배포
firebase deploy --only functions:setAdminClaim
firebase deploy --only functions:onUserCreate
firebase deploy --only functions:onParticipantUpdate
```

## 초기 관리자 설정 스크립트

`scripts/set-initial-admins.ts`:

```typescript
import * as admin from 'firebase-admin';
import { initializeApp, cert } from 'firebase-admin/app';

// Service Account 키 필요
const serviceAccount = require('./service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const ADMIN_CONFIGS = [
  { participantId: 'admin', phoneNumber: '+821000000001' },
  { participantId: 'admin2', phoneNumber: '+821042633467' },
  { participantId: 'admin3', phoneNumber: '+821042627615' },
];

async function setInitialAdmins() {
  for (const config of ADMIN_CONFIGS) {
    try {
      // 전화번호로 사용자 찾기
      const user = await admin.auth().getUserByPhoneNumber(config.phoneNumber);

      // Custom Claims 설정
      await admin.auth().setCustomUserClaims(user.uid, {
        admin: true
      });

      console.log(`✅ Admin claim set for ${config.participantId} (${user.uid})`);
    } catch (error) {
      console.error(`❌ Failed to set admin for ${config.participantId}:`, error);
    }
  }
}

setInitialAdmins()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## 주의사항

1. **Service Account 보안**: Service Account JSON 파일은 절대 Git에 커밋하지 마세요
2. **권한 에스컬레이션 방지**: setAdminClaim 함수는 반드시 기존 관리자만 호출 가능하도록 보호
3. **토큰 새로고침**: Custom Claims 변경 후 클라이언트에서 토큰 새로고침 필요 (최대 1시간 지연)
4. **초기 관리자**: 최초 관리자는 Firebase Console 또는 Admin SDK로 직접 설정

## 향후 개선

1. **Admin 대시보드**: 관리자 권한 관리 UI 구축
2. **감사 로그**: 관리자 권한 변경 이력 기록
3. **역할 세분화**: admin 외 다른 역할 추가 (moderator, editor 등)

---
*이 문서는 Firebase Custom Claims 설정의 권위 있는 문서입니다.*