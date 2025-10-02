# Firebase 설정 가이드

## 📋 개요

Firebase Firestore를 사용하여 참가자 정보 및 독서 인증 자료를 관리합니다.

## 🔧 설정 단계

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 및 생성
4. Google Analytics 설정 (선택사항)

### 2. Firestore Database 생성

1. Firebase Console에서 프로젝트 선택
2. 좌측 메뉴에서 "Firestore Database" 선택
3. "데이터베이스 만들기" 클릭
4. **테스트 모드**로 시작 (나중에 보안 규칙 설정 가능)
5. 리전 선택: `asia-northeast3 (Seoul)` 권장

### 3. Firebase Storage 설정

1. 좌측 메뉴에서 "Storage" 선택
2. "시작하기" 클릭
3. 보안 규칙 기본값으로 시작
4. 리전 선택: `asia-northeast3 (Seoul)` 권장

### 4. 웹 앱 등록

1. 프로젝트 설정 (톱니바퀴 아이콘) 클릭
2. "내 앱"에서 웹 앱 추가 (</> 아이콘)
3. 앱 닉네임 입력
4. Firebase SDK 구성 정보 복사

### 5. 환경 변수 설정

`.env.local` 파일에 Firebase 구성 정보를 입력하세요:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 📊 데이터베이스 구조

### Collections

#### 1. `participants` (참가자)

```typescript
{
  id: string;                    // 문서 ID
  participationCode: string;     // 참여 코드 (고유값)
  name: string;                  // 이름
  email?: string;                // 이메일 (선택)
  phoneNumber?: string;          // 전화번호 (선택)
  cohort?: string;               // 기수 (선택)
  createdAt: Timestamp;          // 생성 일시
  updatedAt: Timestamp;          // 수정 일시
  metadata?: Record<string, any>; // 추가 정보 (확장 가능)
}
```

#### 2. `reading_submissions` (독서 인증)

```typescript
{
  id: string;                    // 문서 ID
  participantId: string;         // 참가자 ID
  participationCode: string;     // 참여 코드
  title?: string;                // 제목 (선택)
  content?: string;              // 내용 (선택)
  imageUrls?: string[];          // 이미지 URLs
  fileUrls?: string[];           // 파일 URLs
  submittedAt: Timestamp;        // 제출 일시
  status: 'pending' | 'approved' | 'rejected'; // 승인 상태
  reviewNote?: string;           // 검토 메모
  createdAt: Timestamp;          // 생성 일시
  updatedAt: Timestamp;          // 수정 일시
  metadata?: Record<string, any>; // 추가 정보 (확장 가능)
}
```

## 🔐 Firestore 보안 규칙 (추천)

Firebase Console > Firestore Database > 규칙에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 참가자 컬렉션
    match /participants/{participantId} {
      // 읽기: 모두 허용 (참여코드 조회용)
      allow read: if true;

      // 쓰기: 인증된 사용자만 (추후 인증 추가 시)
      allow write: if true; // 개발 중에는 true, 나중에 인증 추가
    }

    // 독서 인증 컬렉션
    match /reading_submissions/{submissionId} {
      // 읽기: 모두 허용
      allow read: if true;

      // 쓰기: 모두 허용 (추후 인증 추가 시 제한)
      allow write: if true; // 개발 중에는 true, 나중에 인증 추가
    }
  }
}
```

## 🗂️ Storage 보안 규칙 (추천)

Firebase Console > Storage > 규칙에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reading_submissions/{participationCode}/{fileName} {
      // 읽기: 모두 허용
      allow read: if true;

      // 쓰기: 이미지 파일만 허용 (10MB 제한)
      allow write: if request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 📝 사용 예시

### 참가자 생성

```typescript
import { createParticipant } from '@/lib/firebase';

const participantId = await createParticipant({
  participationCode: 'ABC123',
  name: '홍길동',
  email: 'hong@example.com',
  cohort: '1기',
});
```

### 참가자 조회

```typescript
import { getParticipantByCode } from '@/lib/firebase';

const participant = await getParticipantByCode('ABC123');
```

### 독서 인증 제출

```typescript
import { createSubmission, uploadReadingImage } from '@/lib/firebase';

// 이미지 업로드
const imageUrl = await uploadReadingImage(file, 'ABC123');

// 제출 생성
const submissionId = await createSubmission({
  participantId: 'participant_id',
  participationCode: 'ABC123',
  title: '오늘의 독서',
  content: '책 내용 정리',
  imageUrls: [imageUrl],
  submittedAt: Timestamp.now(),
  status: 'pending',
});
```

### 제출물 조회

```typescript
import { getSubmissionsByCode } from '@/lib/firebase';

const submissions = await getSubmissionsByCode('ABC123');
```

## 🚀 다음 단계

1. ✅ Firebase 프로젝트 생성
2. ✅ Firestore Database 생성
3. ✅ Firebase Storage 설정
4. ✅ 환경 변수 설정
5. 🔄 보안 규칙 설정 (프로덕션 전)
6. 🔄 인증 추가 (필요시)
7. 🔄 UI 컴포넌트 개발

## 🔗 참고 링크

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 가이드](https://firebase.google.com/docs/firestore)
- [Firebase Storage 가이드](https://firebase.google.com/docs/storage)
