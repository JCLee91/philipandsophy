# 푸시 토큰 리셋 후 문제 분석

## 리셋 스크립트가 한 일

```typescript
// reset-all-push-tokens.ts
updates.pushTokens = [];
updates.webPushSubscriptions = [];
updates.pushToken = admin.firestore.FieldValue.delete();
updates.pushTokenUpdatedAt = admin.firestore.FieldValue.delete();
updates.pushNotificationEnabled = false;  // ⚠️ 여기!
```

## 문제 시나리오

### 1️⃣ localStorage가 클리어되지 않았을 가능성

**리셋 전 상태:**
```
localStorage:
  - device-id: "1729497639000-12345-abc123"
  - notification-declined: null
  
Firestore:
  - pushTokens: [{ deviceId: "1729497639000-12345-abc123", token: "..." }]
  - pushNotificationEnabled: true
```

**리셋 후:**
```
localStorage:
  - device-id: "1729497639000-12345-abc123"  ✅ 그대로 유지
  - notification-declined: null  ✅ 그대로 유지
  
Firestore:
  - pushTokens: []  ⚠️ 비었음
  - pushNotificationEnabled: false  ⚠️ false로 변경
```

**프롬프트 로직 (notification-prompt.tsx:119):**
```typescript
if (Notification.permission === 'default' && !hasDeclinedBefore) {
  // 프롬프트 표시
}
```

❌ **문제:** 브라우저 권한이 이미 'granted'면 프롬프트가 안 뜸!

### 2️⃣ notification-declined 플래그 문제

만약 리셋 전에 "나중에" 클릭했다면:
```
localStorage.setItem('notification-declined', 'true');
```

이 플래그는 **리셋 스크립트가 지우지 않았으므로** 그대로 남아있음!

**결과:** 프롬프트가 절대 안 뜸

### 3️⃣ notification-test-shown 플래그

```typescript
const hasShownTestNotification = localStorage.getItem('notification-test-shown');
if (!hasShownTestNotification) {
  // 테스트 알림 표시
}
```

이것도 남아있으면 테스트 알림 안 나옴.

## 해결 방법

### A. localStorage도 함께 클리어하는 스크립트

```typescript
// 브라우저 콘솔에서 실행
localStorage.removeItem('notification-declined');
localStorage.removeItem('notification-test-shown');
localStorage.removeItem('device-id');  // 새로운 device-id 생성되도록
```

### B. 리셋 스크립트 개선

안내 메시지에 localStorage 클리어 안내 추가:
```
✅ Reset complete!

💡 다음 단계:
1. 브라우저에서 F12 → Console 탭 열기
2. 다음 명령어 실행:
   localStorage.clear()
3. 앱 새로고침
```

### C. notification-prompt.tsx 로직 개선

Firestore에서 pushNotificationEnabled가 false이고 토큰이 없으면
localStorage 플래그를 무시하고 프롬프트 표시
