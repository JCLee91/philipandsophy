# 🚨 중요 발견: getDeviceId() 호출 시점 분석

## 호출 위치 7곳

1. **messaging.ts:327** - savePushTokenToFirestore (FCM 저장)
2. **messaging.ts:403** - getPushTokenFromFirestore 
3. **messaging.ts:458** - removePushTokenFromFirestore
4. **messaging.ts:653** - initializeWebPush (Web Push 저장)
5. **notification-prompt.tsx:95** - 프롬프트에서 확인
6. **NotificationToggle.tsx:81** - 토글에서 확인
7. **NotificationToggle.tsx:81** - 토글에서 확인 (중복)

## 플랫폼별 경로

### Android FCM:
```
enableNotifications()
  → initializePushNotifications(messaging, participantId)
  → initializeFCM(messaging, participantId)
  → savePushTokenToFirestore(participantId, token, 'fcm')
  → const deviceId = getDeviceId();  ← 327줄
  → pushTokens: [{ deviceId: "ABC123", ... }]
```

### iOS Web Push:
```
enableNotifications()
  → initializePushNotifications(null, participantId)
  → initializeWebPush(participantId)
  → fetch('/api/push-subscriptions', {
      body: JSON.stringify({
        deviceId: getDeviceId(),  ← 653줄
      })
    })
  → API: webPushSubscriptions: [{ deviceId: "ABC123", ... }]
```

### 토글 확인:
```
checkNotificationStatus(participantId)
  → const deviceId = getDeviceId();  ← 81줄
  → pushTokens.some(t => t.deviceId === deviceId)
  → webPushSubs.some(s => s.deviceId === deviceId)
```

## ✅ 결론: 문제 없음!

모든 경로에서 **동일한 getDeviceId() 함수**를 호출합니다.
localStorage가 정상 작동하면 **항상 같은 값**을 반환합니다.

## 🔍 실제 문제는?

만약 토글이 안 되면:

### 1. localStorage 완전 초기화됨
```
리셋 전: device-id = "ABC123"
리셋 스크립트 실행 → Firestore 토큰 삭제
유저가 localStorage.clear() 실행 → device-id 삭제됨
토글 ON → 새로운 device-id = "XYZ789" 생성
Firestore 저장: pushTokens: [{ deviceId: "XYZ789", ... }]
checkNotificationStatus: device-id = "XYZ789" 확인
✅ hasTokenForThisDevice = true (정상!)
```

### 2. 리셋 스크립트 후 localStorage 안 지움
```
리셋 전: 
  - localStorage: device-id = "ABC123"
  - Firestore: pushTokens: [{ deviceId: "ABC123", ... }]

리셋 스크립트 실행:
  - Firestore: pushTokens: [] (비워짐)
  - localStorage: device-id = "ABC123" (그대로!)

토글 ON 시도:
  - getDeviceId() = "ABC123" (기존 값)
  - savePushTokenToFirestore → pushTokens: [{ deviceId: "ABC123", ... }]
  - checkNotificationStatus → getDeviceId() = "ABC123"
  - pushTokens.some(t => t.deviceId === "ABC123") → true ✅
  - 정상 작동!
```

## 💡 결론

**코드는 문제 없습니다!** 

꼬일 가능성이 없습니다. 플랫폼 감지(FCM/Web Push)와 관계없이 
모든 경로에서 동일한 getDeviceId()를 사용하므로 일관성 보장됩니다.

실제 문제는 다른 곳에 있을 것입니다.
