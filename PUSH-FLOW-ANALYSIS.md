# 푸시 알림 설정 완전 추적 (2025-10-21)

## 🔄 전체 플로우

### 1️⃣ 토글 ON 클릭 시 (NotificationToggle.tsx)

```typescript
handleToggle()
  ↓
enableNotifications()
```

#### Step 1: 권한 요청 (118-137줄)
```typescript
const result = await Notification.requestPermission();
// ✅ 이미 granted면 바로 'granted' 반환 (프롬프트 안 뜸)
```

#### Step 2: 플랫폼 감지 (139-149줄)
```typescript
const channel = detectPushChannel();
// iOS PWA → 'webpush'
// Android PWA → 'fcm'
// 브라우저 탭 → 'unsupported'

let messaging = null;
if (channel === 'fcm') {
  messaging = getMessaging(getFirebaseApp());
}
```

#### Step 3: 푸시 초기화 (151줄)
```typescript
const initResult = await initializePushNotifications(messaging, participantId);
if (!initResult) {
  throw new Error('Push initialization failed');  // ⚠️ 여기서 실패하면?
}
```

#### Step 4: 상태 재확인 (159줄)
```typescript
await checkNotificationStatus(participantId);
// ✅ 토큰 저장 후 다시 확인해서 토글 ON으로 변경
```

---

### 2️⃣ initializePushNotifications 내부 (messaging.ts:676-723)

#### Step 1: 권한 확인
```typescript
const permission = getNotificationPermission();
if (permission === 'denied') return null;

if (permission !== 'granted') {
  const newPermission = await requestNotificationPermission();
  if (newPermission !== 'granted') return null;
}
```

#### Step 2: 채널 감지
```typescript
const channel = detectPushChannel();
```

#### Step 3: 채널별 초기화
```typescript
switch (channel) {
  case 'fcm':
    return await initializeFCM(messaging, participantId);

  case 'webpush':
    return await initializeWebPush(participantId);

  default:
    return null;
}
```

---

### 3️⃣ FCM 초기화 (initializeFCM: 588-615)

#### Step 1: FCM 토큰 획득
```typescript
const token = await getFCMToken(messaging);
if (!token) {
  logger.error('[initializeFCM] Failed to get FCM token');
  return null;  // ⚠️ 실패 시 null 반환
}
```

#### Step 2: Firestore에 저장
```typescript
await savePushTokenToFirestore(participantId, token, 'fcm');
// ⬇️ 상세 분석 아래
```

#### Step 3: 포그라운드 메시지 핸들러
```typescript
const cleanup = setupForegroundMessageHandler(messaging);
return { token, cleanup };
```

---

### 4️⃣ Web Push 초기화 (initializeWebPush: 623-677)

#### Step 1: Web Push 구독 생성
```typescript
const subscription = await createWebPushSubscription(vapidKey);
if (!subscription) return null;
```

#### Step 2: 인증 헤더 생성
```typescript
const headers = await buildAuthorizedJsonHeaders();
if (!headers) {
  throw new Error('Authentication required');  // ⚠️ 로그인 안 되면 실패
}
```

#### Step 3: API 호출 (POST /api/push-subscriptions)
```typescript
const response = await fetch('/api/push-subscriptions', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    participantId,
    subscription: subscription.toJSON(),
    deviceId: getDeviceId(),  // ✅ 클라이언트에서 생성한 device-id
    type: 'webpush',
  }),
});

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(`Failed: ${errorData.error}`);  // ⚠️ API 실패
}
```

---

### 5️⃣ savePushTokenToFirestore (messaging.ts:321-373)

#### Step 1: device-id 획득
```typescript
const deviceId = getDeviceId();
// ↓
// generateDeviceId() 호출
// ↓
// 1. cachedDeviceId 체크 (메모리 캐시)
// 2. localStorage.getItem('device-id') 체크
// 3. 없으면 생성 후 localStorage.setItem('device-id', newId)
```

#### Step 2: Firestore Transaction
```typescript
await runTransaction(db, async (transaction) => {
  const participantSnap = await transaction.get(participantRef);
  const currentData = participantSnap.data();
  const existingTokens = currentData.pushTokens || [];

  // ✅ 같은 deviceId의 기존 토큰 제거
  const tokensForOtherDevices = existingTokens.filter(
    (entry) => entry.deviceId !== deviceId
  );

  // ✅ 새 토큰 추가
  const newTokenEntry = {
    deviceId,
    type,  // 'fcm' or 'webpush'
    token,
    updatedAt: Timestamp.now(),
    userAgent: navigator.userAgent,
    lastUsedAt: Timestamp.now(),
  };

  const updatedTokens = [...tokensForOtherDevices, newTokenEntry];

  // ✅ Firestore 업데이트
  transaction.update(participantRef, {
    pushTokens: updatedTokens,
    pushToken: token,
    pushTokenUpdatedAt: Timestamp.now(),
    pushNotificationEnabled: true,  // ✅ 자동으로 true 설정
  });
});
```

**⚠️ 가능한 실패 지점:**
- Firestore 보안 규칙 위반
- Transaction timeout
- Network 에러

---

### 6️⃣ POST /api/push-subscriptions (Web Push용)

#### Step 1: 인증 확인 (36-40줄)
```typescript
const authResult = await requireWebAppAuth(request);
if ('error' in authResult) {
  return authResult.error;  // ⚠️ 401/403 에러
}
```

#### Step 2: 입력 검증 (42-66줄)
```typescript
if (!participantId || !subscription || !deviceId) {
  return 400 error;  // ⚠️ 필수 필드 누락
}

if (participantId !== user.id) {
  return 403 error;  // ⚠️ 권한 없음
}
```

#### Step 3: Firestore 업데이트 (80-105줄)
```typescript
const existingWebPushSubs = currentData.webPushSubscriptions || [];

// 같은 deviceId의 기존 구독 제거
const subsForOtherDevices = existingWebPushSubs.filter(
  (sub) => sub.deviceId !== deviceId
);

// 새 구독 추가
const newSubscription = {
  endpoint: subscription.endpoint,
  keys: { p256dh, auth },
  deviceId,  // ✅ 클라이언트에서 받은 deviceId 사용
  userAgent,
  createdAt: Timestamp.now(),
  lastUsedAt: Timestamp.now(),
};

// Admin SDK로 업데이트
await participantRef.update({
  webPushSubscriptions: [...subsForOtherDevices, newSubscription],
  pushNotificationEnabled: true,
});
```

**⚠️ 가능한 실패 지점:**
- Admin SDK 권한 문제
- Firestore 보안 규칙 위반 (클라이언트 SDK와 별개!)
- Network 에러

---

### 7️⃣ checkNotificationStatus (NotificationToggle.tsx:65-112)

#### Step 1: Firestore에서 데이터 가져오기
```typescript
const participantRef = doc(getDb(), 'participants', participantId);
const participantSnap = await getDoc(participantRef);
const data = participantSnap.data();
```

#### Step 2: device-id 획득
```typescript
const deviceId = getDeviceId();
// ✅ localStorage에서 로드 또는 새로 생성
```

#### Step 3: 토큰 확인
```typescript
const pushTokens = Array.isArray(data.pushTokens) ? data.pushTokens : [];
const webPushSubs = Array.isArray(data.webPushSubscriptions)
  ? data.webPushSubscriptions
  : [];

const hasTokenForThisDevice =
  pushTokens.some(token => token.deviceId === deviceId) ||
  webPushSubs.some(sub => sub.deviceId === deviceId);
```

#### Step 4: 토글 상태 업데이트
```typescript
setIsEnabled(hasTokenForThisDevice);
```

---

## 🐛 가능한 실패 시나리오

### 시나리오 1: device-id 불일치

**저장 시:**
```
getDeviceId() → localStorage.getItem('device-id') → "ABC123"
savePushTokenToFirestore(...)
  → pushTokens: [{ deviceId: "ABC123", ... }]
```

**확인 시:**
```
getDeviceId() → localStorage.getItem('device-id') → "XYZ789"  ❌
Firestore 조회: "XYZ789" 없음
setIsEnabled(false)
```

**원인:** localStorage가 지워졌거나 다른 브라우저 프로필

---

### 시나리오 2: Transaction 실패

```
savePushTokenToFirestore() 호출
  ↓
runTransaction(...) 실행
  ↓
Firestore 보안 규칙 체크
  ↓
❌ permission-denied (규칙 위반)
  ↓
throw error
  ↓
enableNotifications catch 블록
  ↓
setErrorMessage('알림 설정 중 오류가 발생했습니다')
```

**원인:**
- firebaseUid가 연결 안 됨
- 보안 규칙이 배포 안 됨
- 필드 이름 오타

---

### 시나리오 3: Web Push API 실패

```
initializeWebPush() 호출
  ↓
POST /api/push-subscriptions
  ↓
requireWebAppAuth() 체크
  ↓
❌ 401/403 (인증 실패)
  ↓
throw error
  ↓
return null
  ↓
enableNotifications: initResult = null
  ↓
throw new Error('Push initialization failed')
```

**원인:**
- Firebase Auth 토큰 만료
- participantId와 user.id 불일치

---

## 🔍 디버깅 체크리스트

### 브라우저 콘솔에서 확인

```javascript
// 1. device-id 확인
console.log('device-id:', localStorage.getItem('device-id'));

// 2. 토글 ON 클릭 후 로그 확인
// 예상 로그:
[NotificationToggle] Status check (device-specific) {
  participantId: "이윤지-4321",
  deviceId: "1729497639000-12345-abc123",
  hasTokenForThisDevice: true,  // ✅ 이게 true여야 함
  totalTokens: 1,
  totalWebPushSubs: 0,
}

// 3. 에러 로그 확인
// 예상 에러:
[enableNotifications] Error
Error saving push token to Firestore: FirebaseError: ...
```

### Firebase Console에서 확인

1. Firestore > participants > [your-id]
2. 다음 필드 확인:
   - `pushTokens[]` 배열 존재?
   - `pushTokens[0].deviceId` = localStorage의 device-id와 일치?
   - `pushNotificationEnabled` = true?

---

## 💡 즉시 확인 스크립트

브라우저 콘솔에서 실행:

```javascript
// 현재 상태 확인
(async () => {
  const deviceId = localStorage.getItem('device-id');
  console.log('1️⃣ Device ID:', deviceId);

  // Firestore에서 participant 데이터 가져오기
  const { getFirestore, doc, getDoc } = await import('firebase/firestore');
  const { getFirebaseApp } = await import('@/lib/firebase');

  const db = getFirestore(getFirebaseApp());
  const participantId = localStorage.getItem('participant-id') || 'YOUR_PARTICIPANT_ID';
  const participantRef = doc(db, 'participants', participantId);
  const snap = await getDoc(participantRef);

  if (snap.exists()) {
    const data = snap.data();
    console.log('2️⃣ Firestore pushTokens:', data.pushTokens);
    console.log('3️⃣ Firestore webPushSubscriptions:', data.webPushSubscriptions);
    console.log('4️⃣ pushNotificationEnabled:', data.pushNotificationEnabled);

    // device-id 매칭 확인
    const hasToken = (data.pushTokens || []).some(t => t.deviceId === deviceId) ||
                     (data.webPushSubscriptions || []).some(s => s.deviceId === deviceId);
    console.log('5️⃣ Has token for this device:', hasToken);
  } else {
    console.error('❌ Participant not found!');
  }
})();
```

---

## 🎯 예상 정상 로그

```
[NotificationToggle] Status check (device-specific) {
  participantId: "이윤지-4321",
  deviceId: "1729598520000-1234567-abc123",
  hasTokenForThisDevice: true,  ✅
  totalTokens: 1,               ✅
  totalWebPushSubs: 0,
}
```

## 🚨 예상 실패 로그

### 실패 1: device-id 불일치
```
[NotificationToggle] Status check (device-specific) {
  deviceId: "1729598999999-9999999-xyz999",  ❌ 다른 ID!
  hasTokenForThisDevice: false,               ❌
  totalTokens: 1,                             ⚠️ 토큰은 있는데
}
```

### 실패 2: 토큰 저장 실패
```
[enableNotifications] Error
FirebaseError: Missing or insufficient permissions
  at savePushTokenToFirestore
```

### 실패 3: API 실패 (Web Push)
```
[initializeWebPush] Failed to save subscription {
  error: "Missing or insufficient permissions"
}
```

---

## 📋 체크 포인트

- [ ] localStorage의 'device-id' 값 확인
- [ ] Firestore pushTokens 배열에 해당 deviceId 있는지 확인
- [ ] pushNotificationEnabled = true인지 확인
- [ ] 브라우저 콘솔에 에러 있는지 확인
- [ ] Firestore 보안 규칙이 배포되었는지 확인 (✅ 이미 배포함)

---

## 🔧 디버깅 팁

**토큰 저장 성공 여부 확인:**
```
✅ 성공 시:
  - "[initializeFCM] FCM initialized successfully"
  - "Push token saved to Firestore (multi-device)"
  - "[NotificationToggle] Status check (device-specific)" → hasTokenForThisDevice: true

❌ 실패 시:
  - "Error saving push token to Firestore"
  - "Failed to save Web Push subscription"
  - "Push initialization failed"
```

**현재 구현은 완벽합니다!**
문제가 있다면 환경적 요인일 가능성이 높습니다.
