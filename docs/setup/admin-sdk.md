# Firebase Admin SDK 설정 가이드

## 📋 Service Account 키 다운로드

### 1. Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. `philipandsophy` 프로젝트 선택

### 2. Service Account 키 생성
1. 좌측 메뉴에서 **⚙️ 프로젝트 설정** 클릭
2. **서비스 계정** 탭 클릭
3. **새 비공개 키 생성** 버튼 클릭
4. 확인 후 **키 생성** 클릭
5. JSON 파일 자동 다운로드

### 3. 키 파일 저장
다운로드한 JSON 파일을:
```bash
# 프로젝트 루트에 저장
mv ~/Downloads/philipandsophy-xxxxx.json ./firebase-service-account.json

# .gitignore에 이미 추가되어 있음 (절대 커밋하지 마세요!)
```

### 4. 환경변수 설정 (선택사항)
`.env.local`에 추가:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

## 🔐 보안 주의사항

⚠️ **절대 Git에 커밋하지 마세요!**
- `.gitignore`에 `firebase-service-account.json` 포함되어 있음
- 이 키는 전체 Firebase 프로젝트에 대한 관리자 권한
- 유출 시 즉시 Firebase Console에서 키 삭제

## ✅ 설정 완료 확인

```bash
# 키 파일 존재 확인
ls -la firebase-service-account.json

# 시딩 테스트
npm run seed:cohorts
```

## 📝 다음 단계

Service Account 키 다운로드 후:
1. ✅ `firebase-service-account.json` 파일이 프로젝트 루트에 있는지 확인
2. ✅ Admin SDK 시딩 스크립트 실행
3. ✅ 정상 작동 확인
