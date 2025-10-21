# 디바이스 ID 문제 테스트

## 브라우저 콘솔에서 실행하세요

```javascript
// 1. 현재 저장된 device-id 확인
console.log('현재 device-id:', localStorage.getItem('device-id'));

// 2. device-id 생성 함수 테스트 (3번 연속 호출)
for (let i = 0; i < 3; i++) {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const fingerprint = `${ua}-${screen}-${timezone}-${language}`;
  const hash = Array.from(fingerprint).reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0
  );
  const deviceId = `${Date.now()}-${Math.abs(hash)}-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`테스트 ${i+1}:`, deviceId);
}

// 3. localStorage에서 device-id 제거 후 다시 생성되는지 확인
localStorage.removeItem('device-id');
console.log('device-id 제거 완료');

// 페이지 새로고침 후 다시 확인
```

## 예상 결과

**정상:**
```
현재 device-id: 1729497639000-12345-abc123
테스트 1: 1729598000000-12345-xyz789
테스트 2: 1729598000001-12345-def456  // timestamp만 다름
테스트 3: 1729598000002-12345-ghi123  // random만 다름
```

**문제:**
```
현재 device-id: null  ❌ localStorage에 저장 안 됨!
테스트 1: 1729598000000-12345-abc123
테스트 2: 1729598000001-67890-xyz789  ❌ hash가 계속 바뀜!
테스트 3: 1729598000002-11111-def456  ❌ 완전히 다른 값!
```

## 문제 시나리오

만약 Safari Private Mode이거나 localStorage가 작동하지 않으면:
1. 토글 ON 클릭
2. device-id = "ABC123" 생성
3. Firestore에 저장: `pushTokens: [{ deviceId: "ABC123", ... }]`
4. 저장 완료
5. `checkNotificationStatus` 호출
6. 새로운 device-id = "XYZ789" 생성 (localStorage 실패)
7. Firestore에서 "XYZ789" 조회 → 없음
8. `setIsEnabled(false)` → 토글 OFF로 표시

## 해결책

localStorage가 작동하지 않으면 sessionStorage나 메모리에 캐시
