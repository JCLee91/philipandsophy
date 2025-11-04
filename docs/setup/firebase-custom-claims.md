# Firebase Custom Claims 설정 가이드

**Last Updated**: 2025-11-04
**Category**: setup

## Overview

Firebase Custom Claims와 Participant 필드를 사용한 역할 기반 권한 관리 시스템입니다.

## 현재 시스템 아키텍처

### 역할 구조 (Participant 필드 기반)

이 프로젝트는 **Participant 문서 필드**를 사용하여 3가지 특수 역할을 관리합니다:

```typescript
interface ParticipantData {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';

  // 🔐 역할 필드
  isSuperAdmin?: boolean;   // 슈퍼 관리자 (모든 프로필 열람, 리스트 미표시)
  isAdministrator?: boolean; // 일반 관리자 (공지사항 관리, 프로필 열람 제약 동일)
  isGhost?: boolean;         // 고스트 참가자 (테스트용, 리스트 미표시, 오늘의 서재 접근 가능)

  cohortId: string;
  // ... other fields
}
```

### 역할 권한 매트릭스

| 기능 | Super Admin | Administrator | Ghost | Regular User |
|------|-------------|---------------|-------|--------------|
| **Data Center 접근** | ✅ 전체 | ✅ 전체 | ❌ 불가 | ❌ 불가 |
| **모든 프로필 열람** | ✅ 가능 | ❌ 제약 동일 | ❌ 제약 동일 | ❌ 제약 동일 |
| **공지사항 작성/수정/삭제** | ✅ 가능 | ✅ 가능 | ❌ 불가 | ❌ 불가 |
| **참가자 리스트 표시** | ❌ 숨김 | ✅ 표시 | ❌ 숨김 | ✅ 표시 |
| **오늘의 서재 접근** | ✅ 가능 | ✅ 가능 | ✅ 가능 | ✅ 가능 |
| **AI 매칭 관리** | ✅ 가능 | ✅ 가능 | ❌ 불가 | ❌ 불가 |

### 현재 관리자 계정

**Super Admin (1명)**:
- `admin` - 운영자 (전화번호: `01000000001`)

**Administrators (2명)**:
- `admin2` - 문준영 (전화번호: `42633467921`)
- `admin3` - 김현지 (전화번호: `42627615193`)

**참고**: 일반 관리자는 Data Center 접근 가능하지만 Super Admin처럼 모든 프로필을 자유롭게 열람할 수 없음

### Custom Claims vs Participant Fields

| 방식 | 장점 | 단점 | 현재 사용 여부 |
|------|------|------|---------------|
| **Custom Claims** | • Firestore Rules에서 빠른 검증<br>• 토큰 기반 인증 | • Firebase Functions 필요<br>• 토큰 갱신 필요 (최대 1시간 지연) | ❌ 미사용 |
| **Participant Fields** | • 즉시 반영<br>• 구현 간단<br>• Functions 불필요 | • API Route에서 추가 조회 필요 | ✅ **현재 사용 중** |

**결정 사유**: 소규모 프로젝트에서는 Participant 필드 방식이 더 간단하고 즉시 반영되어 효율적

---

## 🎯 Quick Start: Ghost/Super Admin 설정

### Ghost 참가자 추가 (테스트용)

Firebase Console에서 Participant 문서에 직접 필드 추가:

```javascript
// Firestore Console에서 participants/{participantId} 문서 수정
{
  id: "ghost-test",
  name: "테스트 고스트",
  cohortId: "cohort1",
  isGhost: true,          // ✅ 고스트 플래그 추가
  isAdministrator: false,
  isSuperAdmin: false
}
```

**효과**:
- ✅ 오늘의 서재 접근 가능
- ✅ 독서 인증 제출 가능
- ✅ 참가자 리스트에서 숨김
- ❌ Data Center 접근 불가
- ❌ 관리자 기능 불가

### Super Admin 추가

```javascript
// Firestore Console에서 participants/admin 문서 수정
{
  id: "admin",
  name: "운영자",
  cohortId: "cohort1",
  isSuperAdmin: true,      // ✅ 슈퍼 관리자 플래그
  isAdministrator: true,   // ✅ 일반 관리자 플래그도 true로
  isGhost: false
}
```

**효과**:
- ✅ Data Center 접근 가능
- ✅ 모든 프로필 자유롭게 열람
- ✅ 공지사항 관리
- ✅ AI 매칭 관리
- ✅ 참가자 리스트에서 숨김

### Administrator 추가

```javascript
// Firestore Console에서 participants/admin2 문서 수정
{
  id: "admin2",
  name: "문준영",
  cohortId: "cohort1",
  isSuperAdmin: false,     // ❌ 슈퍼 관리자 아님
  isAdministrator: true,   // ✅ 일반 관리자만
  isGhost: false
}
```

**효과**:
- ✅ Data Center 접근 가능
- ❌ 프로필 열람 제약 (일반 참가자와 동일)
- ✅ 공지사항 관리
- ✅ AI 매칭 관리
- ✅ 참가자 리스트에 표시됨

---

## 🛠️ 구현 세부사항

### API Route 권한 검증

```typescript
// src/lib/api-auth.ts (line 111-125)
export async function requireAuthToken(request: NextRequest) {
  // ... Firebase Auth 검증 ...

  const participant = await getParticipantByFirebaseUid(decoded.uid);

  // Super Admin 또는 Administrator만 Data Center 접근 가능
  if (participant.isSuperAdmin !== true && participant.isAdministrator !== true) {
    return {
      participant: null,
      firebaseUid: null,
      email: null,
      error: NextResponse.json(
        { error: '데이터센터 접근 권한이 없습니다.', code: 'INSUFFICIENT_PRIVILEGES' },
        { status: 403 }
      ),
    };
  }

  return { participant, firebaseUid: decoded.uid, email: decoded.email, error: null };
}
```

### Firestore Security Rules

```javascript
// firestore.rules (line 18-20, 29-35)
function isAdminClaim() {
  return isSignedIn() && request.auth.token.admin == true;
}

function isAdminParticipant() {
  return isSignedIn() &&
         exists(/databases/$(database)/documents/participants/admin) &&
         get(/databases/$(database)/documents/participants/admin).data.firebaseUid == request.auth.uid &&
         get(/databases/$(database)/documents/participants/admin).data.isAdministrator == true;
}
```

**참고**: 현재 Rules는 Custom Claims 준비만 되어있고 실제로는 Participant 필드로 검증

### UI 레벨 권한 제어

```typescript
// src/hooks/use-access-control.ts
export function useAccessControl() {
  const { participant } = useAuth();

  const isSuperAdmin = participant?.isSuperAdmin === true;
  const isAdministrator = participant?.isAdministrator === true;
  const isGhost = participant?.isGhost === true;

  const canAccessDataCenter = isSuperAdmin || isAdministrator;
  const canViewAllProfiles = isSuperAdmin;
  const canManageNotices = isSuperAdmin || isAdministrator;
  const isHiddenFromList = isSuperAdmin || isGhost;

  return {
    isSuperAdmin,
    isAdministrator,
    isGhost,
    canAccessDataCenter,
    canViewAllProfiles,
    canManageNotices,
    isHiddenFromList,
  };
}
```

---

## 📚 Custom Claims 마이그레이션 가이드 (선택사항)

현재 시스템은 Participant 필드를 사용하지만, 향후 Custom Claims로 마이그레이션할 수 있습니다.

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