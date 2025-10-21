# 푸시 허용 안 되는 문제 체크리스트

## 1. 브라우저 콘솔 확인사항
다음 로그들을 확인해주세요:

```
# 토큰 저장 시도 로그
[initializePushNotifications] Channel detected: { channel: ... }
[initializeFCM] FCM initialized successfully
[initializeWebPush] Web Push initialized successfully

# 에러 로그
Error: ...
Failed to ...
```

## 2. localStorage 확인
브라우저 개발자 도구 > Application > Local Storage에서:
- `device-id` 값 확인
- `notification-declined` 값 확인

## 3. Firestore 확인
Firebase Console > Firestore Database > participants > [your-id]
- pushTokens 배열 확인
- webPushSubscriptions 배열 확인
- 현재 device-id와 일치하는 항목이 있는지 확인

## 4. 가능성 높은 원인

### 원인 1: localStorage의 device-id가 클리어됨
- 리셋 스크립트 실행 전: device-id = "ABC"
- localStorage 클리어
- 토큰 저장 시도: 새로운 device-id = "XYZ" 생성
- Firestore에는 "XYZ"로 저장됨
- checkNotificationStatus: 또 다른 device-id = "123" 생성
- "123"으로 조회하니 토큰 없음 → OFF로 표시

### 원인 2: 토큰 저장 실패
- API 호출 실패 (permission-denied)
- 네트워크 에러
- Service Worker 문제

### 원인 3: notification-declined 플래그
- localStorage에 'notification-declined' = 'true'
- 프롬프트가 안 뜸
