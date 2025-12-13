# React Native 앱 MVP 플레이북 (웹 유지 + 앱 별도 개발 + Firebase + Push + Data Center 유지)

**문서 목적**: 새 개발자가 이 문서만 보고 “기존 웹앱은 그대로 운영(=서비스 유지)하면서, 참가자용 RN 앱을 별도로 개발/출시(푸시 포함)하고, 출시 이후 웹 사용자들을 앱으로 전환”까지 그대로 구현/진행할 수 있도록, 구현 순서와 설계 결정을 매우 구체적으로 정리합니다.  
**프로젝트(현재 레포) 전제**: Next.js 16 + React 19 + Firebase(Firestore/Storage/Auth/FCM) 기반. 관리자 콘솔은 `src/app/datacntr/**`(Data Center)로 운영 중이며, 참가자용 웹앱은 `src/app/app/**`에 존재합니다.

---

## 0. 최종 목표/범위(확정)

### 0.1 최종 목표
1) **기존 웹앱은 계속 운영**(앱 출시 전까지 기존 사용자 경험 유지)  
2) **RN 앱을 “별도 채널”로 개발**하고, 앱 출시 이후 웹 사용자를 앱으로 유도/전환  
3) 계정/권한의 단일 기준은 Firebase Auth이며, **신청/승인/참가자 매핑은 `uid` 기준으로 표준화**  
4) React Native(Expo prebuild/EAS) 앱에서 **카카오/구글 로그인** 후 `firebaseUid`로 참가자 문서를 조회하여 웹앱과 동일 기능 제공  
5) 푸시 알림은 **공지/DM/인증 리마인드/수동 푸시**까지 전부 지원  
   - 웹(기존): Web Push/FCM(PWA) 경로가 남아 있을 수 있음  
   - 앱(신규): FCM 단일(= iOS는 APNs 연동 포함)

### 0.2 범위(앱에 포함)
- 참가자 기능: 공지/DM(운영자↔참가자)/프로필북/프로필 상세/독서 인증 제출(이미지 업로드)/Today’s Library/설정(푸시 토글 등)
- **참가자 간 채팅 없음**(현 웹앱과 동일)

### 0.3 범위(앱에 미포함)
- 관리자 Data Center는 앱에 넣지 않음(웹으로 유지)

---

## 0.4 “웹 유지 + 앱 추가” 운영 전략(중요)

### 원칙
- **앱이 완성되기 전까지 웹을 깨지지 않게 유지**한다(기능 회귀/권한/푸시 등 리스크를 최소화).
- “새로운 인증/신청/승인 모델”을 도입하더라도, 기존 웹 사용자에게 **갑작스런 로그인 변경을 강제하지 않는다**(필요 시 단계적 전환).

### 권장 단계적 전환(현실적인 롤아웃)
1) (사전) 웹에 **카카오/구글 로그인**을 “신청(/application) 전용”으로 먼저 도입  
2) Data Center에 “신청서 승인” 기능 추가 → 승인 시 `participants.firebaseUid`를 세팅  
3) (앱 개발) RN 앱이 같은 `uid` 체계를 사용하도록 맞춤(카카오 커스텀 토큰 공용)  
4) (앱 출시) 웹앱 상단 배너/모달로 앱 설치 유도 + 딥링크(공지/DM) 연결  
5) (전환 완료) 특정 기수/기간 이후 웹앱 기능을 “읽기 전용”으로 제한하거나, 신규 사용자 유입은 앱으로만 받는 정책으로 점진 전환

---

## 1. 현재 레포의 “기준 사실”(구현 시 참고)

### 1.1 참가자 매핑 방식(현행)
- 참가자 문서: `participants/{participantId}`에 `firebaseUid: string | null`이 존재 (`src/types/database.ts`)
- 클라이언트는 `firebaseUid`로 참가자 조회를 수행 (`src/lib/firebase/participants.ts`의 `getParticipantByFirebaseUid`)
- AuthContext는 Firebase Auth 세션 + 참가자 문서를 합쳐 상태를 관리 (`src/contexts/AuthContext.tsx`)

### 1.2 신청(지원서) 흐름(현행)
- `/application`에서 내부 폼을 사용하는 경우, 제출은 **Make 웹훅(`NEXT_PUBLIC_MAKE_WEBHOOK_URL`)**로 전송 (`src/features/application/hooks/use-application.ts`)
- Firestore에 “신청서”를 저장하는 컬렉션은 아직 표준화되어 있지 않음(= 이번 작업에서 추가)

### 1.3 푸시(현행)
- `participants`에 `pushTokens: PushTokenEntry[]`, `webPushSubscriptions` 등이 존재 (`src/types/database.ts`)
- 클라이언트 측 저장 로직이 `pushTokens`/`webPushSubscriptions`를 업데이트함 (`src/lib/firebase/messaging.ts`의 `savePushTokenToFirestore`)
- **주의**: 현재 `firestore.rules`의 `participants` 업데이트 allowlist에 `pushTokens`, `webPushSubscriptions`, `pushNotificationEnabled`가 포함되어 있지 않으면 저장이 실패할 수 있음(실제 규칙/운영값을 확인 후 규칙을 정합하게 업데이트 필요).

---

## 2. 목표 아키텍처(웹/데이터센터/앱/서버 역할 분리)

### 2.1 구성 요소
- **Web (Next.js)**: 랜딩 + 신청 + 기존 참가자 웹앱 유지(서비스 지속)
- **Data Center (Next.js, `/datacntr`)**: 운영자 승인/참가자 관리/푸시 발송(수동)/공지 발행/DM 운영
- **Firebase Auth**: 카카오/구글 로그인
- **Firestore**: 신청서/참가자/공지/메시지/인증 데이터
- **Firebase Functions**: 카카오 로그인 커스텀 토큰 발급, 푸시 발송(이벤트 트리거/수동/스케줄)
- **React Native 앱(Expo prebuild)**: 참가자 앱 (FCM push 포함)

### 2.2 핵심 설계 원칙(중요)
1) **“신청/참가자 식별”의 단일 키는 Firebase Auth `uid`**
2) 승인 전에는 참가자 데이터 접근을 제한한다(= 참가자 앱/웹앱 보호)
3) Data Center 승인 시에만 `participants.firebaseUid`가 확정된다
4) 카카오 로그인은 플랫폼별 SDK를 쓰더라도 최종적으로 **동일 UID 규칙**으로 Firebase Auth에 로그인되어야 한다  
   - 권장: `uid = "kakao:{kakaoId}"`로 커스텀 토큰 발급(웹과 RN 모두 동일)
5) 푸시 발송은 **서버(Functions/Admin SDK)에서만** 수행한다(토큰 fan-out/정리/로그 포함)
6) 웹은 앱 출시 전까지 유지되며, 출시 이후에도 일정 기간 **병행 운영**할 수 있다(전환 정책에 따라 단계적으로 축소)

---

## 3. 데이터 모델(새로 추가/표준화)

### 3.1 `applications` 컬렉션(신규, 표준)
경로: `applications/{uid}`  
목적: 신청/지원서를 “계정 단위”로 저장하고, 승인 워크플로우를 Data Center에서 처리

필수 필드(권장):
- `uid: string` (문서 ID와 동일)
- `provider: 'google' | 'kakao'` (신청 당시 로그인 provider)
- `email?: string | null` (가능하면 저장)
- `status: 'draft' | 'submitted' | 'approved' | 'rejected'`
- `answers: Record<string, unknown>` (신청서 원본 answers)
- `submittedAt?: Timestamp`
- `reviewedAt?: Timestamp`
- `reviewedBy?: string` (관리자 uid)
- `cohortIdRequested?: string | null` (지원자가 선택한 기수/타입이 있으면 저장)
- `participantId?: string | null` (승인 후 매핑된 participantId)

선택 필드:
- `metadata`: 유입채널, UTM, funnel session id 등

### 3.2 `participants` 컬렉션(기존)과의 연결 규칙(변경 핵심)
- 승인 전: `participants` 문서가 없거나, 있어도 `firebaseUid`가 신청자 uid와 매핑되지 않음
- 승인 시:
  - (A) **새 participant 문서 생성** 후 `firebaseUid = uid`로 세팅
  - (B) 또는 기존 participant(사전등록) 문서가 있다면 그 문서에 `firebaseUid = uid`만 연결
- 앱/웹앱은 항상 `getParticipantByFirebaseUid(uid)`로 참가자 문서를 가져오며, 없으면 “승인 대기/접근 제한” 화면으로 유도

---

## 4. 인증(카카오/구글) 구현 스펙

### 4.1 구글 로그인(웹/앱)
웹(Next.js):
- Firebase Auth Google Provider 사용(팝업/리다이렉트 방식 중 선택)

RN(Expo prebuild):
- `@react-native-google-signin/google-signin` + Firebase Auth credential 로그인(권장)

### 4.2 카카오 로그인(웹/앱 공통 핵심)
카카오 로그인은 “Firebase 기본 Provider”가 아니므로, 최종적으로는 아래 방식이 가장 재사용성이 높음:
1) 클라이언트(웹/앱)가 카카오 OAuth로 `authorization_code` 획득
2) 클라이언트가 Functions로 `code` 전달
3) Functions가 카카오 토큰 교환 + 사용자 정보 조회(`kakaoId` 확보)
4) Functions가 `uid = "kakao:{kakaoId}"` 규칙으로 Firebase **Custom Token** 발급
5) 클라이언트가 `signInWithCustomToken`으로 Firebase 로그인

이렇게 하면 “웹에서 카카오 로그인한 계정”과 “앱에서 카카오 로그인한 계정”이 **동일 UID**를 갖습니다(= 참가자 매핑이 깨지지 않음).

---

## 5. 웹(랜딩/신청) 작업 상세

### 5.1 `/application`에 Auth Gate 추가(로그인 선행)
목표: 신청 페이지 진입 시, 로그인되지 않았다면 “로그인 화면”만 노출하고 신청 폼은 숨김.

중요: 이 변경은 **기존 참가자용 웹앱(`/app`)을 막기 위한 것이 아니라**, “신청 데이터의 키를 uid로 표준화”하기 위한 것입니다.  
즉, 앱을 별도로 개발하더라도 웹 서비스는 계속 제공할 수 있으며, 신청/승인 체계만 먼저 정리해두는 목적입니다.

작업 지점:
- `src/app/application/page.tsx`
- `src/contexts/AuthContext.tsx` (현재는 Phone Auth 기반 UI/상태를 포함하므로, “소셜 로그인 상태”를 함께 다루도록 확장하거나 별도 Auth Gate 컴포넌트를 추가)

권장 UX:
1) `user == null` → 로그인 카드(카카오/구글 버튼)
2) `user != null` AND `applications/{uid}.status`가 `approved`가 아니어도 신청은 가능(= 신청은 참가자 승인 전에도 해야 함)
3) 신청 제출 시 Firestore에 저장 후 “제출 완료”

### 5.2 신청 제출을 Firestore 표준(`applications/{uid}`)로 저장
현재 `src/features/application/hooks/use-application.ts`의 제출은 Make 웹훅 중심.

MVP 권장:
- 기존 Make 전송은 유지(운영 자동화가 이미 있다면)
- **동시에 Firestore에도 저장**(Data Center 승인 워크플로우용)

제출 시 저장 로직(권장):
- `status = 'submitted'`
- `submittedAt = serverTimestamp()`
- `answers = useApplicationStore.answers` 원본 그대로 저장
- `provider/email` 등도 함께 저장(가능한 값만)

### 5.3 “승인 대기/참가자 앱 접근” 안내 문구
로그인만 하고 신청까지 끝난 상태에서, 참가자용 웹앱(`/app`)을 들어가면 참가자 문서가 없을 수 있음.

권장 정책:
- `getParticipantByFirebaseUid(uid)`가 null → “승인 대기” 화면 + 문의/안내

관련 코드 위치:
- `src/hooks/useParticipant.ts`
- `src/contexts/AuthContext.tsx`의 `participantStatus`가 `missing`일 때 처리

---

## 5.4 앱 출시 이후 “웹 → 앱 전환” 구현 가이드(운영/UX)

앱을 별도로 출시했을 때, 기존 웹 사용자를 자연스럽게 앱으로 전환시키는 방법을 정리합니다.

### 전환 목표(권장)
- 웹 사용자가 앱 설치/로그인을 완료하도록 유도(푸시 수신 안정성/UX 일관성 확보)
- 전환 완료 후에도 “웹은 최소 기능(예: 공지 읽기)” 정도로 남기거나, 특정 cohort부터는 웹 기능을 축소

### 전환 방법(권장 우선순위)
1) **웹앱 배너/모달**: `/app/**` 상단에 “앱에서 더 편하게 이용하기” 배너 + App Store/Play Store 링크
2) **딥링크(Universal Links/App Links)**: 공지/DM 링크를 누르면 앱이 열리도록 구성  
   - 앱 미설치 시 스토어/웹 fallback
3) **로그인 후 안내**: `participant`가 존재하고 `deviceTokens(app)`가 없으면 “앱 설치” 안내(선택)
4) **푸시 전환**: 웹푸시/앱푸시를 병행 발송하되, 앱 설치 완료 사용자에게는 앱푸시를 우선(토큰 존재 기준)

### 전환 타이밍(권장 정책)
- 앱 출시 직후: 웹+앱 병행(사용자에게 선택권 제공)
- 안정화 후(예: 2~4주): 신규 cohort는 앱 사용을 기본 권장
- 장기: 웹은 랜딩/신청/관리자 중심으로 남기고, 참가자 활동은 앱 중심으로 운영

---

## 6. Data Center(관리콘솔) 작업 상세: “신청서 승인 → 참가자 생성/연결”

### 6.1 Data Center에 신청서 목록/상세/승인 UI 추가
권장 라우트:
- `/datacntr/applications` : 신청서 리스트
- `/datacntr/applications/[uid]` : 상세 + 승인/거절 + 코호트 선택

권장 기능:
- 필터: `status`, 기간, 기수, 유입채널 등(최소 MVP는 status/기간)
- 상세: answers 표시(현재 폼 질문 구조에 맞게 렌더)
- 승인(Approve):
  - `cohortId` 선택(필수)
  - `participants` 생성 또는 기존 연결
  - `applications/{uid}.status = approved`, `participantId` 기록
- 거절(Reject): `applications/{uid}.status = rejected`

### 6.2 승인 시 참가자 문서 생성/연결(서버에서만)
원칙:
- 참가자 문서 생성/갱신은 **Admin SDK**로만 수행(클라이언트에서 `firebaseUid`를 쓰는 규칙은 제거/축소)

승인 로직(권장 순서):
1) `applications/{uid}` 읽기
2) 이미 `status=approved`이면 idempotent 처리
3) `participants` 검색:
   - 사전등록 문서가 있다면(예: phoneNumber 또는 내부 식별자 기준) 그 문서를 업데이트
   - 없다면 신규 생성(최소 필수 필드 포함)
4) 선택된 participant에 `firebaseUid = uid` 설정
5) `applications/{uid}` 업데이트(`status`, `participantId`, `reviewedAt`, `reviewedBy`)

### 6.3 Data Center API 방식(권장)
현재 레포는 Data Center API에서 Firebase ID Token을 검증하고 참가자를 조회 (`src/lib/api-auth.ts`).

권장:
- 신청서/승인 관련도 동일하게:
  - `Authorization: Bearer {idToken}`로 요청
  - 서버(Next API Route 또는 Functions)에서 Admin SDK로 처리

---

## 7. Firestore Rules(권한) 변경 지침

### 7.1 `applications` 규칙(신규)
요구사항:
- 로그인 사용자: 본인 문서(`applications/{request.auth.uid}`)에 대해 create/read/update 가능
- 관리자: 모든 신청서 read + status 변경/승인 가능

핵심 포인트:
- 승인 로직은 서버에서 처리하므로, 클라이언트가 `status=approved`로 바꾸는 것을 막아야 함

### 7.2 `participants` 규칙 조정(중요)
목표 구조에서는 “승인 시 서버가 `firebaseUid`를 세팅”하므로, 아래 중 하나를 선택:
- **옵션 A(권장)**: 클라이언트에서 `firebaseUid` 업데이트를 전면 금지(서버만 가능)
- **옵션 B(과도기)**: 최초 1회 연결만 허용하되, 승인 워크플로우와 충돌하지 않도록 강한 조건을 둠

추가로 푸시 토큰 저장을 클라이언트가 해야 한다면:
- 본인 participant 문서에 대해 `pushTokens`, `pushNotificationEnabled` 업데이트를 안전하게 허용(허용 키를 최소화)
- 또는 “푸시 토큰 등록”을 Callable Function으로 옮겨서 Rules 단순화(권장, 특히 RN 앱에서는 서버 등록이 더 안정적)

---

## 8. Firebase Functions 작업 상세

### 8.1 카카오 로그인 커스텀 토큰 발급 함수
권장 함수:
- `authKakaoSignIn` (HTTPS Callable 또는 HTTPS onRequest)

입력:
- `code: string`
- `redirectUri: string`
- (모바일 PKCE 사용 시) `codeVerifier?: string`

동작:
1) 카카오 토큰 교환
2) `kakaoId` 및 이메일 등 조회
3) `uid = "kakao:{kakaoId}"`로 custom token 발급
4) 반환: `{ customToken, uid, provider: 'kakao', kakaoId, email }`

### 8.2 푸시 발송(서버 전용)
요구사항:
- 공지 발행 시 cohort 대상 전송
- DM 생성 시 수신자 전송
- 인증 리마인드 스케줄러(Cloud Scheduler)
- 수동 푸시(관리자 UI에서 호출)

권장 설계:
- “메시지/공지/리마인드 이벤트”는 Functions에서 통일 처리
- 발송 로그를 Firestore에 남김(최소 `push_logs` 컬렉션)
- 실패 토큰 정리(만료/Invalid token 제거)

기존 참고:
- `src/lib/push/send-notification.ts`에 server-side 푸시 발송 로직 존재(이 구조를 Functions로 이관/재사용 여부 결정)

---

## 9. React Native 앱(Expo prebuild/EAS) 작업 상세

### 9.1 프로젝트 생성/구조(권장)
레포 전략(선택):
- (권장) 모노레포: `apps/web(현재)`, `apps/mobile`, `packages/shared`
- (단기) 별도 레포로 `mobile`을 만들고, API/타입은 문서화로 맞추기

MVP에서 공유하면 좋은 것:
- Firestore 컬렉션/필드 상수
- zod 스키마(신청서 answers, participant, notice, message 등)
- 날짜 정책(새벽 0~2시 예외 같은 도메인 로직)

### 9.2 로그인
구글:
- RN에서 Google Sign-In → Firebase credential 로그인

카카오:
- 카카오 OAuth(앱) → `authKakaoSignIn` 호출 → `signInWithCustomToken`

### 9.3 참가자 접근 제어
앱 시작 시:
1) Firebase `onAuthStateChanged`로 `user` 확보
2) `participants where firebaseUid == user.uid` 조회
3) 없으면 “승인 대기” 화면
4) 있으면 홈 진입

### 9.4 푸시(FCM, iOS/Android)
권장 스택:
- `@react-native-firebase/messaging` + (필요 시) `@notifee/react-native`(포그라운드 표시/채널 관리)

필수 구현:
- 권한 요청(iOS), 토큰 발급, 토큰 갱신 이벤트 처리
- `participants.pushTokens`(type=`fcm`)에 토큰 등록
- 알림 탭 시 딥링크로 라우팅: `noticeId`, `threadId` 등

서버 발송 payload 규칙(권장):
- `data.type`: `notice` | `dm` | `reminder` | `manual`
- `data.targetId`: noticeId 또는 conversationId 등
- `notification.title/body`는 OS 표시용

---

## 10. 단계별 작업 순서(새 개발자용 “그대로 따라 하기”)

### Phase 0: 준비/정책 확정(반드시 먼저)
- [ ] Firebase 프로젝트에 Google 로그인 활성화
- [ ] Kakao 개발자 콘솔 설정(redirect URI, 앱 키, 동의항목)
- [ ] iOS/Android 앱 패키지명 확정(FCM/APNs/EAS 설정에 필요)
- [ ] “승인 전 접근 제한” UX 확정(웹앱/앱 공통)

### Phase 1: 웹 로그인 선행 + 신청서 Firestore 저장
- [ ] `/application` Auth Gate 구현
- [ ] 카카오/구글 로그인 UI 구현
- [ ] 제출 시 `applications/{uid}` 저장(기존 Make 웹훅은 병행 가능)
- [ ] 승인 대기 화면 처리(AuthContext/라우팅)

### Phase 2: Data Center 신청서 승인 기능
- [ ] 신청서 리스트/상세 UI 추가
- [ ] 승인/거절 API 추가(Admin SDK 기반)
- [ ] 승인 시 participant 생성/연결 + applications 업데이트

### Phase 3: 카카오 커스텀 토큰 Functions
- [ ] `authKakaoSignIn` 구현(웹/앱 공용)
- [ ] 로컬/스테이징/프로덕션 환경 분리(.env/Functions config)

### Phase 4: RN 앱 MVP(기능 동등)
- [ ] 로그인(구글/카카오) + 승인 대기 처리
- [ ] 공지/DM/프로필/인증 제출/Today’s Library 구현
- [ ] 푸시 토큰 등록 + 수신/딥링크 처리

### Phase 5: 푸시 4종 E2E
- [ ] 공지 발행 → cohort 푸시
- [ ] DM 전송 → 수신자 푸시
- [ ] 인증 리마인드(스케줄) → 대상자 푸시
- [ ] 수동 푸시(Data Center) → 타겟 푸시

### Phase 6: 웹→앱 전환(출시 이후)
- [ ] 웹앱에 “앱 설치 유도 배너/모달” 적용(조건: 로그인 사용자)
- [ ] 딥링크(Universal Links/App Links) 스펙 확정 및 라우팅 구현
- [ ] 푸시 발송 시 “앱 토큰 우선, 웹 토큰은 보조” 정책 적용(토큰 존재 여부로 분기)
- [ ] 전환 완료 정책 수립(예: 특정 cohort부터 웹은 읽기 전용)

---

## 11. 완료 정의(DoD, MVP)
- [ ] 웹에서 로그인 후 신청 제출 시 Firestore에 신청서가 저장된다
- [ ] Data Center에서 신청서를 승인하면 `participants.firebaseUid`가 매핑된다
- [ ] 승인된 계정은 웹앱/앱에서 로그인하면 바로 참가자 화면으로 진입한다
- [ ] iOS/Android 실기기에서 푸시 4종이 모두 동작한다(딥링크 포함)

---

## 12. 자주 생기는 이슈/트러블슈팅(체크리스트)

### 12.1 “로그인은 됐는데 참가자 화면이 안 나와요”
- `participants`에 `firebaseUid == user.uid` 문서가 존재하는지 확인
- 승인 로직이 participant 생성/연결을 제대로 했는지 확인
- Firestore Rules가 참가자 읽기를 막고 있지 않은지 확인

### 12.2 “푸시 토큰 저장이 안 돼요”
- Rules에서 `pushTokens` 업데이트 허용 여부 확인(또는 서버 등록 함수 사용)
- iOS 권한 요청/설정(알림 허용, 앱 Capabilities) 확인
- FCM 토큰이 갱신되었을 때 업데이트 로직이 있는지 확인

### 12.3 “카카오 웹/앱 로그인 uid가 달라요”
- 반드시 `uid = "kakao:{kakaoId}"` 규칙을 사용하고, web/app 둘 다 동일 Functions를 사용해야 함
- 카카오 OAuth 구현이 “앱 내부 SDK”든 “웹뷰”든, 최종적으로 Functions에서 kakaoId로 uid를 만들도록 고정

---

## 13. 다음 작업(권장 문서화/정리)
- `applications` 스키마를 `docs/database/schema.md`에도 반영
- “푸시 payload 규격”, “딥링크 라우팅 규칙”을 별도 문서로 분리(테스트 케이스 포함)
