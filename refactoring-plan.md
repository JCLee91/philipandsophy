# ProjectPNS 안정성 리팩토링 계획

**작성일**: 2025-10-23  
**작성자**: Codex (Context7 MCP 기준 작업)  
**목표**: 새로운 기능 추가보다 **무결하고 안정적인 운영**을 최우선으로, Next.js 15 / React 19 / Firebase 기반의 ProjectPNS를 오류 없이 동작하도록 리팩토링한다.

---

## 1. 리팩토링 원칙

- **버그 방지 > 기능 확장**: 잠재적 오류 제거와 예외 처리를 모든 작업의 최우선으로 한다.
- **공식 가이드 우선**: Context7 MCP에서 확보한 공식 문서(Next.js Production Checklist, TanStack Query v5 Best Practices, Firebase Security Rules)를 준수한다.
- **테스트 가능한 변경**: 각 단계의 변경은 최소 1가지 검증 루틴(lint, 스모크 테스트, Emulator 기반 수동 테스트 등)을 수반하며, 회귀 방지를 위해 결과를 기록한다.
- **점진적 적용**: 대규모 변경은 단계별 PR/커밋 단위로 쪼개고, 페이즈별 완료 후 다음 단계로 진행한다.

---

## 2. 단계별 계획

### Phase 0 — 진단 및 안전망 구축 (우선순위 최고)

| 목표 | 상세 작업 | 검증 |
|------|-----------|------|
| 현재 상태 진단 | `npm run lint`, TypeScript 빌드 체크, Firebase Emulator 스모크(로그인/공지/제출 흐름) 실행. | lint 로그, Emulator 결과 스크린샷 또는 요약 |
| 도구 준비 | React Query Devtools를 게으른 로딩 모드로 연결(프로덕션 토글)하여 상태 추적 가능하게 함. | Devtools 토글 정상 동작 확인 |
| 문서·워크플로 통합 | Context7 워크스페이스에 주요 내부 문서(아키텍처, DB 스키마, 퍼포먼스 가이드) 업로드 및 태깅. | Context7에서 문서 검색 테스트 |

**출력물**: 진단 리포트, 이슈 목록, Context7 메모(“Baseline Findings”)

---

### Phase 1 — 인증·레이아웃 경계 정비

| 영역 | 개선 포인트 | 구현 항목 | 참조 문서 |
|------|-------------|-----------|-----------|
| `src/app/app/layout.tsx` | `'use client'` 선언으로 전체 앱이 클라이언트 전용 → 서버 컴포넌트 전환 필요 | - 레이아웃을 서버 컴포넌트화하고 ViewModeProvider 등 클라이언트 로직은 하위에 배치<br>- App Router 가이드에 따라 `unstable_cache`/Suspense 구성 검토 | `/vercel/next.js/v15.1.8` Production Checklist |
| `src/contexts/AuthContext.tsx` | Firebase Auth → Firestore 조회까지 직접 처리, 오류 시 상태 불안정 | - 세션 확인은 Route Handler/Server Action에서 처리, 클라이언트엔 정제된 DTO만 전달<br>- TanStack Query `useQuery`/`select`로 재구성, 에러 리트라이는 Query 정책에 위임 | `/tanstack/query/v5.71.10` Render Optimizations |
| 라우팅 보호 | cohortId 누락/세션 미확인 시 페이지가 깨짐 | - 서버에서 인증 후 리다이렉션 처리, `redirect` 유틸 사용<br>- 에러 페이지/로깅 강화 | Next.js Auth Patterns |

**검증**:  
- 로그인 → Cohort 진입 → 채팅 화면 진입 시 에러 미발생  
- Auth 실패 시 `/app`으로 안정적 리다이렉션 로그 확인  
- React Query Devtools로 Auth 캐시가 정상 유지됨 확인

---

### Phase 2 — 관리자(Data Center) API & 보안 강화

| 영역 | 개선 포인트 | 구현 항목 | 참조 문서 |
|------|-------------|-----------|-----------|
| Route Handlers (`src/app/api/datacntr/*`) | `requireWebAppAdmin` 검증 이후 Firestore Rules와 불일치 가능성 | - Firestore Rules 정비: `get/list/create/update/delete` 세분화, Custom Function 통일<br>- 서버 로직에서도 동일 조건(예: isAdministrator, isSuperAdmin) 검증 | `/websites/firebase_google` Security Rules Guide |
| 데이터 쿼리 | 참가자/제출 집계 시 중복 호출과 예외 처리 부족 | - IN 쿼리 실패 케이스(10개 분할) 예외 처리<br>- 실패 시 재시도/로그 분리 | TanStack Query Retry Guide |
| 로깅·모니터링 | 관리자 API 실패 시 로그 메시지 단일함 | - `logger.error` 구조화, Context7 노트에 공통 실패 패턴 정리 | 내부 Logger 가이드 |

**검증**:  
- Firestore Emulator Rules 테스트(`firebase emulators:exec`)  
- 관리자 계정: API 정상 응답 / 일반 사용자: 403 응답  
- 에러 케이스에 대한 로그 확인

---

### Phase 3 — 멤버 포털 주요 흐름 안정화

| 영역 | 개선 포인트 | 구현 항목 | 참조 문서 |
|------|-------------|-----------|-----------|
| 채팅 화면 (`src/app/app/chat/page.tsx`) | 거대한 클라이언트 컴포넌트가 모든 기능을 담당 → 오류 추적 어려움 | - 데이터 패칭을 서버 컴포넌트 + 다중 Client 컴포넌트로 분리<br>- Route Handler에서 공지/참가자/제출 데이터 병렬 fetch | Next.js Parallel Data Fetching |
| 제출/DM 모달 | Firebase Storage 업로드 실패 시 UI만 멈춤 | - 오류 알림(Toast) 및 재시도 버튼 추가<br>- 업로드 성공/실패 상태를 React Query mutation으로 일원화 | TanStack Mutations |
| View Mode | iOS PWA용 분기 로직(Path Navigation) race condition 가능 | - `isNavigating` 상태를 Route transition hook 또는 Router 이벤트로 대체<br>- Context7에 race condition 해결 사례 기록 | 내부 iOS PWA 가이드 |

**검증**:  
- 공지 작성/수정/삭제, DM 송신, 독서 제출 플로우 수동 테스트  
- 실패 시 UI 피드백/로그 확인  
- React Query Devtools에서 쿼리/뮤테이션 상태 정상 여부 확인

---

### Phase 4 — Functions & 배치 스크립트 안전화

| 영역 | 개선 포인트 | 구현 항목 | 참조 문서 |
|------|-------------|-----------|-----------|
| Firebase Functions (`functions/src/index.ts` 등) | 타입 검증/로깅 일관성 부족 | - 공용 `logger`, `schema` 유틸 추출<br>- 배포 전 `npm run lint` + `firebase emulators:exec` 파이프라인 구성 | Firebase Functions Emulator Docs |
| Worker (`worker/index.js`) | SW 캐시 버전 관리 부족 | - 캐시 키 버전화, 업데이트 시 이전 버전 클린업<br>- 업데이트 알림 UI 제공 검토 | Next.js PWA Patterns |
| Scripts (`scripts/`, `src/scripts/`) | 운영 스크립트 오류 시 롤백 없음 | - Firestore Emulator에서 dry run 지원 추가<br>- 결과 리포트 출력과 종료코드 관리 | Node.js CLI Best Practices |

**검증**:  
- Emulator 기반 함수 실행 성공  
- PWA 업데이트 흐름 테스트 (캐시 미스 시 자동 리로드)  
- 주요 스크립트 dry run 로그 확인

---

## 3. Context7 MCP 활용 전략

- **공식 문서 연결**: `/vercel/next.js/v15.1.8`, `/tanstack/query/v5.71.10`, `/websites/firebase_google`, `/shadcn-ui/ui` 라이브러리를 워크스페이스에 고정 등록하여 검색 지연 없이 참조.
- **내부 문서 업로드**: `docs/architecture/system-architecture.md`, `docs/database/schema.md`, `docs/optimization/performance.md` 등 핵심 문서를 Context7에 업로드하고 `landing`, `portal`, `datacntr`, `backend` 태그를 부여.
- **작업 로그 기록**: 페이즈별 리스크, 해결 방법, 참고 링크를 Context7 노트로 관리 → 회귀 시 재활용.
- **QA 체크리스트 자동화**: Context7에 테스트 케이스를 입력해 QA 단계에서 질의형 점검이 가능하도록 준비.

---

## 4. 리스크 및 대응책

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| 인증 로직 변경으로 인한 사용자 세션 초기화 | 운영자/참가자의 즉시 접근 불가 | 세션 전환 작업 전 공지, 롤백 스크립트 준비 |
| Firestore Rules 강화로 기존 API 호출 실패 | 관리자 기능 중단 | Emulator에서 모든 API 플로우 검증 → 단계별 배포 |
| 채팅 페이지 분리 중 반응성 저하 | 사용자 UX 악화 | React Query Devtools로 상태 추적, 병렬 fetch & Suspense로 로딩 개선 |
| 서비스 워커 캐시 갱신 미흡 | PWA 동작 불안정 | 버전드 캐시 + 업데이트 알림 UI 도입 |

---

## 5. 산출물 & 마일스톤

- **Phase 0 완료**: 진단 리포트, 에러/경고 티켓화 (1주)
- **Phase 1~3 완료**: 각 플로우별 리팩토링 PR, QA 체크리스트 업데이트 (4~5주)
- **Phase 4 완료**: Functions/Worker/Scripts 안정화, 문서화 (1~2주)
- **최종 문서화**: Context7 노트 + `docs/development` 내 리팩토링 회고 추가

---

## 6. 커뮤니케이션 계획

- 주간 진행 상황 메모를 Context7에 정리 후 공유.
- 주요 변경 전 Slack/이메일로 운영팀과 사전 공유.
- QA 완료 시 체크리스트와 로그를 팀 저장소에 기록.

---

### 부록: 참조 링크

- Next.js Production Checklist (Context7 ID: `/vercel/next.js/v15.1.8`)
- TanStack Query Docs (Context7 ID: `/tanstack/query/v5.71.10`)
- Firebase Security Rules Guide (Context7 ID: `/websites/firebase_google`)
- shadcn/ui Registry (Context7 ID: `/shadcn-ui/ui`)
- 내부 문서: `docs/architecture/system-architecture.md`, `docs/database/schema.md`, `docs/optimization/performance.md`

---

본 계획은 “버그 없는 무결한 작동”을 최우선 가치로 하며, 각 Phase는 안정성 검증 후에만 다음 단계로 이동합니다. 필요 시 본 문서를 업데이트하며, 변경 이력은 Context7 메모와 Git 기록으로 추적합니다.

