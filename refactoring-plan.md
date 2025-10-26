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

## 2. 단계별 계획 (Stage Plan)

| Stage | 목표 | 핵심 산출물 | 현황 |
|-------|------|-------------|------|
| Stage 1 | 레이아웃·인증 경계 재정비 | 서버 레이아웃 전환, Devtools lazy 로딩, 라우팅 보호 강화 | ⚠️ 진행 중 |
| Stage 2 | 공용 레이어 구축 & 경량 보안 점검 | 컴포넌트/훅 인벤토리, 도메인별 폴더링, Firestore Emulator 스모크 테스트 | ⏳ 대기 |
| Stage 3 | 도메인 구조 분리 & 운영 안정화 | `/app/chat` 분리 + Route Handler, 기타 화면 정리, Worker/스크립트 개선 | ⏳ 대기 |

### Stage 1 — 레이아웃·인증 경계 재정비

| 영역 | 작업 항목 | 검증 |
|------|-----------|------|
| `/app/layout.tsx` | 서버 컴포넌트로 전환, ViewModeProvider·Service Worker 등록은 하위 Client 컴포넌트로 이동 | 빌드 시 경고 없음, hydration mismatch 미발생 |
| Provider 계층 | `src/app/AppClientProviders.tsx`(또는 providers.tsx)에서 React Query Devtools lazy import, `process.env.NODE_ENV` 분기 적용 | 프로덕션 번들에서 Devtools 제거 확인 |
| 라우팅 보호 | `/app` 진입 시 Route Handler(or middleware)에서 인증/코호트 확인 후 리다이렉트 처리, UI 레벨의 중복 체크 제거 | 로그인 → Cohort → 채팅 순서 테스트, 미인증 시 `/app` 복귀 |
| Auth/Push 초기화 | PushNotificationRefresher 및 AuthProvider 간 의존성 재검토, 필요 시 커스텀 훅으로 캡슐화 | 로그인/로그아웃, 토글 ON/OFF 시 토큰 유지 확인 |

**완료 기준**  
- Devtools가 개발 모드에서만 로드되는지 확인 (`npm run build` 번들 사이즈 측정).  
- `/app/layout.tsx`가 서버 컴포넌트이고, Child 컴포넌트 경계를 통과해도 hydration warning이 없음.  
- 인증 실패 → `/app` 리다이렉트 플로우가 서버 사이드에서 처리됨 (네트워크 탭 확인).

### Stage 2 — 공용 레이어 구축 & 경량 보안 점검

| 영역 | 작업 항목 | 검증 |
|------|-----------|------|
| 컴포넌트 인벤토리 | `src/components`, `src/hooks`, `src/lib` 전수 조사 → 중복/거대 컴포넌트를 목록화하고 도메인별 폴더 구조 초안 수립 (`components/chat`, `components/datacntr` 등) | 인벤토리 문서/Context7 노트 작성 |
| 서비스/훅 레이어 | 공지·DM·제출 등 주요 도메인에 대해 공용 훅(`useNoticeActions`, `useDMThread` 등) 설계안 마련, UI는 상태 결합만 담당하도록 분리 계획 수립 | 새 훅 사용 예시 (샘플 컴포넌트) |
| Firestore/보안 | 기존 Rules 유지하되, Firestore Emulator에서 관리자/일반 사용자 시나리오 스모크 테스트만 수행 | `firebase emulators:exec` 결과 및 로그 |
| 로깅 체계 | Cloud Functions/클라이언트 로그를 검토하여 Rules 관련 에러 패턴 파악, 필요 시 TODO 목록화 | 로그 점검 결과를 Context7 메모로 저장 |

**완료 기준**  
- 공용 컴포넌트/훅 인벤토리 문서가 존재하고 팀 공유됨.  
- 최소 1회 Firestore Emulator 스모크 테스트 결과(스크린샷/로그) 확보.  
- 대형 컴포넌트 리팩토링 우선순위 리스트가 정리됨.

### Stage 3 — 도메인 구조 분리 & 운영 안정화

| 영역 | 작업 항목 | 검증 |
|------|-----------|------|
| `/app/chat` | 공지/DM/참가자/푸터 영역을 독립 컴포넌트로 분리, Route Handler에서 초기 데이터 fetch, Server Component + Client Component 경계 재구성 | 분리된 컴포넌트 구조, e2e 시나리오(공지 작성/DM 전송/푸터 액션) 통과 |
| 기타 화면 | `/app/profile`, `/app/cohorts`, `/app/admin/*` 등도 서버/클라이언트 경계를 점검, 중복 UI를 Stage 2에서 정의한 공용 컴포넌트로 교체 | QA 시나리오 (프로필 진입, 매칭 관리) 통과 |
| Worker | `worker/index.js` 캐시 버전 키 도입, 업데이트 알림 UX 검토 | PWA 업데이트 테스트 (버전 증가 시 새 자원 fetch) |
| 스크립트 | `scripts/`, `src/scripts/` 주요 작업에 dry-run 옵션 및 결과 리포트 추가 | dry run 실행 결과 (콘솔 로그/README) |
| Functions | Stage 2에서 정의한 서비스 레이어 적용, 배포 전 `npm run lint`/`npm run build` 루틴 확립 | Functions 배포 체크리스트 문서화 |

**완료 기준**  
- `/app/chat/page.tsx`가 경량 컨테이너 역할만 수행하고 데이터 fetch는 Route Handler 또는 Server Component가 담당.  
- PWA 버전 업데이트 시 캐시 충돌 없이 자동/수동 갱신 가능.  
- 주요 배치/운영 스크립트가 dry-run을 지원하고 README에 사용법이 문서화됨.
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

- **Stage 1**: 레이아웃/인증 경계 재정비 → 1~2주
- **Stage 2**: 공용 레이어 인벤토리 + Firestore 스모크 테스트 → 1~1.5주
- **Stage 3**: `/app/chat` 구조 분리, 기타 화면 정리, Worker/스크립트 개선 → 3주
- **최종 문서화**: Context7 노트 + `docs/development` 내 리팩토링 회고 갱신

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

본 계획은 “버그 없는 무결한 작동”을 최우선 가치로 하며, 각 Stage는 안정성 검증 후에만 다음 단계로 이동합니다. 필요 시 본 문서를 업데이트하며, 변경 이력은 Context7 메모와 Git 기록으로 추적합니다.
