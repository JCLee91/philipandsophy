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
# Firebase Configuration (Client-Side)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCEFXW_Gvp_lJtYy35xe288ncvtfSHbFqY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=philipandsophy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=philipandsophy
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=philipandsophy.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=518153642299
NEXT_PUBLIC_FIREBASE_APP_ID=1:518153642299:web:a6c0aa959b7cf9bc57571e

# Naver Book Search API (Server-Side Only - NO NEXT_PUBLIC_ prefix)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# Firebase Admin Service Account Path (Migration Scripts Only)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# AI Provider Configuration (Vercel AI SDK)
AI_PROVIDER=google
AI_MODEL=gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Firebase Cloud Messaging - Push Notifications
NEXT_PUBLIC_FCM_VAPID_KEY=your_fcm_vapid_public_key

# Standard Web Push API - VAPID Keys (iOS Safari + All Platforms)
NEXT_PUBLIC_WEBPUSH_VAPID_KEY=your_webpush_vapid_public_key
WEBPUSH_VAPID_PRIVATE_KEY=your_webpush_vapid_private_key

# Internal Service Secret (Cron ↔ Next.js API authentication)
INTERNAL_SERVICE_SECRET=your_internal_service_secret

# Firebase Functions URL
NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-philipandsophy.cloudfunctions.net

# Manual Matching Preview Function (Cloud Run URL)
NEXT_PUBLIC_MANUAL_MATCHING_URL=your_manual_matching_url
MANUAL_MATCHING_URL=your_manual_matching_url
```

**중요 환경 변수 설명**:
- `NEXT_PUBLIC_*`: 클라이언트 사이드에서 접근 가능 (브라우저 노출 OK)
- `NAVER_*`: 서버 사이드 전용 (절대 NEXT_PUBLIC_ 붙이지 않기)
- `INTERNAL_SERVICE_SECRET`: Firebase Functions ↔ Next.js API 인증용
- `WEBPUSH_VAPID_PRIVATE_KEY`: 서버 전용 (절대 노출 금지)

## 📊 데이터베이스 구조

**📚 완전한 Firestore 스키마 정의는 [TRD 문서](../architecture/trd.md#41-firebase-firestore-스키마)를 참조하세요.**

이 프로젝트는 6개의 주요 컬렉션을 사용합니다:
1. **cohorts**: 기수 정보 (accessCode, 날짜 범위, AI 매칭 결과)
2. **participants**: 참가자 프로필 (세션 관리, 책 메타데이터)
3. **reading_submissions**: 독서 인증 제출물 (자동 승인)
4. **notices**: 공지사항
5. **messages**: 1:1 다이렉트 메시지
6. **matching_jobs**: AI 매칭 작업 큐 (비동기 처리)

**주요 특징**:
- ✅ **자동 승인 시스템**: 모든 독서 인증이 즉시 승인
- ✅ **책 메타데이터**: 네이버 책 검색 API 연동
- ✅ **세션 관리**: Firebase Auth 없이 자체 토큰 시스템 사용

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

      // 쓰기: 모두 허용 (개발 중 - 추후 인증 추가 시 제한)
      allow write: if true;
    }

    // 독서 인증 컬렉션
    match /reading_submissions/{submissionId} {
      // 읽기: 모두 허용 (프로필북 조회용)
      allow read: if true;

      // 생성: 필수 필드 검증 + 자동 승인 강제
      allow create: if request.resource.data.keys().hasAll([
        'participantId', 'participationCode', 'bookTitle',
        'bookImageUrl', 'review', 'dailyQuestion', 'dailyAnswer',
        'submittedAt', 'submissionDate', 'status', 'createdAt', 'updatedAt'
      ]) && request.resource.data.status == 'approved'; // 항상 자동 승인

      // 수정/삭제: 모두 허용 (개발 중 - 추후 관리자 권한으로 제한)
      allow update, delete: if true;
    }

    // 코호트 컬렉션
    match /cohorts/{cohortId} {
      allow read: if true;
      allow write: if true; // 관리자만 쓰기 가능하도록 변경 예정
    }

    // 공지사항 컬렉션
    match /notices/{noticeId} {
      allow read: if true;
      allow write: if true; // 관리자만 쓰기 가능하도록 변경 예정
    }

    // 메시지 컬렉션
    match /messages/{messageId} {
      allow read: if true;
      allow write: if true; // 참가자 본인과 관리자만 접근하도록 변경 예정
    }
  }
}
```

**보안 규칙 설명**:
- ✅ **독서 인증 자동 승인 강제**: `status == 'approved'` 검증으로 수동 승인 불가
- ✅ **필수 필드 검증**: 모든 필수 필드가 포함되어야만 생성 허용
- ⚠️ **개발 모드**: 현재는 대부분 `if true`로 설정 (프로덕션 전 인증 추가 필요)

## 🗂️ Storage 보안 규칙 (추천)

Firebase Console > Storage > 규칙에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 공지사항 이미지
    match /notices/{cohortId}/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // 독서 인증 이미지
    match /reading_submissions/{participationCode}/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // 다이렉트 메시지 이미지
    match /direct_messages/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### Storage 경로 구조 (2025-10-10)

| 경로 | 용도 | 예시 |
|------|------|------|
| `notices/{cohortId}/{timestamp}_{filename}` | 공지사항 이미지 | `notices/cohort1/1728545123_notice.webp` |
| `reading_submissions/{participationCode}/{timestamp}_{filename}` | 독서 인증 이미지 | `reading_submissions/ABC123/1728545123_book.jpg` |
| `direct_messages/{userId}/{timestamp}_{filename}` | DM 이미지 | `direct_messages/user123/1728545123_photo.png` |

**주요 특징**:
- 모든 이미지 URL은 Firestore에 저장
- 타임스탬프 기반 파일명으로 중복 방지
- 이미지 파일만 업로드 허용 (10MB 제한)

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

---

**Last Updated**: 2025-11-04
**Version**: V2.0 (환경 변수 전체 업데이트)
**Location**: `docs/setup/firebase.md`
