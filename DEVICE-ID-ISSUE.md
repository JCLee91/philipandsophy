# device-id 꼬임 가능성 분석

## 🚨 의심 지점

### FCM vs Web Push 저장 경로

**FCM (Android):**
```typescript
// initializeFCM → savePushTokenToFirestore
const deviceId = getDeviceId();  // ← 저장 시점 1
await runTransaction(db, async (transaction) => {
  transaction.update(participantRef, {
    pushTokens: [{ deviceId, token, ... }],  // ← pushTokens 배열
  });
});
```

**Web Push (iOS):**
```typescript
// initializeWebPush → fetch('/api/push-subscriptions')
body: JSON.stringify({
  deviceId: getDeviceId(),  // ← 저장 시점 2
  ...
});

// API route.ts
await participantRef.update({
  webPushSubscriptions: [{ deviceId, ... }],  // ← webPushSubscriptions 배열
});
```

### 확인 시점

```typescript
// checkNotificationStatus
const deviceId = getDeviceId();  // ← 확인 시점 3

const hasTokenForThisDevice =
  pushTokens.some(token => token.deviceId === deviceId) ||  // ← FCM 배열
  webPushSubs.some(sub => sub.deviceId === deviceId);      // ← Web Push 배열
```

## ⚠️ 꼬일 수 있는 시나리오

### 시나리오 A: localStorage 동작 불안정

**1차 호출 (저장):**
```
getDeviceId()
  → cachedDeviceId = null
  → localStorage.getItem('device-id') = null
  → 새로 생성: "ABC123"
  → localStorage.setItem('device-id', 'ABC123') ✅
  → cachedDeviceId = "ABC123" ✅
  → Firestore 저장: deviceId = "ABC123"
```

**2차 호출 (확인) - 메모리 캐시 유지 중:**
```
getDeviceId()
  → cachedDeviceId = "ABC123" ✅
  → return "ABC123"
  → Firestore 조회: deviceId = "ABC123" ✅
  → hasTokenForThisDevice = true ✅
```

**2차 호출 (확인) - 페이지 새로고침 후:**
```
getDeviceId()
  → cachedDeviceId = null (새로고침으로 초기화)
  → localStorage.getItem('device-id') = "ABC123" ✅
  → cachedDeviceId = "ABC123"
  → return "ABC123"
  → 정상 작동 ✅
```

**2차 호출 (확인) - localStorage 실패:**
```
getDeviceId()
  → cachedDeviceId = null
  → localStorage.getItem('device-id') = null  ❌ (Private Mode?)
  → 새로 생성: "XYZ789"  ❌
  → localStorage.setItem('device-id', 'XYZ789') 실패 (catch)
  → cachedDeviceId = "XYZ789"
  → return "XYZ789"
  → Firestore 조회: deviceId = "XYZ789" 없음 ❌
  → hasTokenForThisDevice = false ❌
```

### 시나리오 B: 메모리 캐시 누락

현재 코드:
```typescript
let cachedDeviceId: string | null = null;  // ← 파일 최상단

function generateDeviceId(): string {
  if (cachedDeviceId) {  // ← 메모리 캐시 체크
    return cachedDeviceId;
  }
  
  // ... localStorage 체크
  
  cachedDeviceId = deviceId;  // ← 메모리에 저장
  return deviceId;
}
```

**문제:** 
- HMR(Hot Module Replacement)로 파일 리로드 시 `cachedDeviceId = null` 초기화됨
- 페이지 새로고침 시 `cachedDeviceId = null` 초기화됨

**해결:** localStorage가 정상 작동하면 문제 없음

---

## 🧪 즉시 테스트

브라우저 콘솔에서:

```javascript
// localStorage 작동 확인
try {
  localStorage.setItem('test', 'value');
  const val = localStorage.getItem('test');
  localStorage.removeItem('test');
  console.log('✅ localStorage 정상:', val === 'value');
} catch (e) {
  console.error('❌ localStorage 실패:', e);
}

// device-id 일관성 테스트 (5회 호출)
const ids = [];
for (let i = 0; i < 5; i++) {
  // 페이지의 getDeviceId 함수 호출하려면 import 필요
  const id = localStorage.getItem('device-id');
  ids.push(id);
}
console.log('device-id 일관성:', new Set(ids).size === 1 ? '✅ 일관됨' : '❌ 불일치');
console.log('값들:', ids);
```

---

## 💡 예상 원인

1. **localStorage Private Mode 제한**
   - iOS Safari Private Mode
   - Android Incognito Mode
   - PWA에서는 일반적으로 작동하지만...

2. **localStorage quota 초과**
   - 극히 드묾
   - 5-10MB 제한

3. **브라우저 버그**
   - iOS 18.x PWA localStorage 버그?
   - 재현 어려움

---

## 🔧 해결 방안

### 방안 1: IndexedDB 사용 (가장 안정적)
```typescript
// IndexedDB는 Private Mode에서도 작동 (제한적이지만)
// 더 큰 용량
// 비동기 API
```

### 방안 2: 토큰 자체를 키로 사용
```typescript
// deviceId 대신 token/endpoint를 키로 사용
// 문제: 토큰이 갱신되면 중복 발생
```

### 방안 3: localStorage 실패 시 경고
```typescript
if (localStorage 저장 실패) {
  alert('알림 설정을 위해 브라우저 설정에서 쿠키/저장소를 허용해주세요');
}
```
