# Stage 2 Inventory & Folder Strategy

**Last updated:** 2025-10-24  
**Owner:** Codex

## 1. Current Asset Overview

### Components
- `components/ui` (15 files) – shadcn-based primitives (button, dialog, toast, table, etc.).
- Chat-centric components: `Notice{Item,WriteDialog,EditDialog,DeleteDialog}`, `ParticipantsList`, `DirectMessageDialog`, `MessageGroup`, `ChatPageSkeleton`, `FooterActions`, `ProfileImageDialog`, `MatchingReasonBanner`.
- Data Center suite (`components/datacntr/*`) – layout, table, dashboard widgets, AI chat panel, form helpers.
- App-level helpers: `AppBodyClass`, `AppViewportEffect`, `PushNotificationRefresher`, `AppClientProviders`.
- Misc: `Header`, `Footer`, `Tooltip`, `LoadingSpinner`, `HistoryWeekRow`, `BookmarkCard` 등.

### Hooks
- Shared: `use-notices`, `use-participants`, `use-submissions`, `use-messages`, `use-cohorts`, `use-toast`, `use-push-notifications`, `use-image-upload`, `use-modal-cleanup`, `use-access-control`, `useParticipant`.
- Derived counts: `use-submission-count`, `use-yesterday-submission-count`, `use-today-submission-count`.
- Data Center: `datacntr/use-datacntr-stats`, `datacntr/use-activity-chart`.

### Lib/Services
- `lib/firebase/*` (admin/auth/client/collections/storage/messaging/webpush).
- `lib/datacntr/*` (engagement, sanitize, status).
- `lib/push/*` (helpers, send-notification).
- `lib/matching-utils`, `lib/message-grouping`, `lib/navigation`, `lib/platform-detection`, `lib/image-validation`.

## 2. Pain Points
- `/app/app/chat/page.tsx` monopolizes notice/DM/participant logic (~380 lines).
- 비즈니스 훅이 페이지 내부에 분산돼 재사용이 어려움 (예: 공지 CRUD, DM 처리).
- Data Center 컴포넌트는 폴더 구조가 있으나 hooks/service와의 연관 관계가 명확하지 않음.
- 공통 Notification/Toast/Storage 에러 처리 로직이 각 컴포넌트에 중복.

## 3. Proposed Folder Structure

```
src/
  app/
    (unchanged – pages stay minimal and consume domain layers)
  components/
    chat/
      Notice/
        NoticeList.tsx
        NoticeComposer.tsx
        NoticeImageUploader.tsx
      DM/
        DirectMessageDialog.tsx
        MessageList.tsx
        MessageComposer.tsx
      Participants/
        ParticipantListSheet.tsx
        ParticipantCard.tsx
      Footer/
        ChatFooterActions.tsx
    datacntr/
      (existing structure; tie hooks/services below)
    shared/
      Header.tsx
      Footer.tsx
      LoadingSpinner.tsx
      Tooltip.tsx
      ...
    ui/
      (shadcn primitives)
  hooks/
    chat/
      useNoticeActions.ts
      useDirectMessageActions.ts
      useChatNavigation.ts
    datacntr/
      useDatacntrStats.ts
      useActivityChart.ts
    auth/
      useParticipant.ts (existing)
    shared/
      useToast.ts
      useImageUpload.ts
      usePushNotifications.ts
      ...
  services/
    chat/
      notices.ts (query + mutation wrappers)
      messages.ts
      participants.ts
    datacntr/
      cohorts.ts
      metrics.ts
    auth/
      session.ts (Firebase auth helper, cookie sync)
```

## 4. Immediate Refactor Targets

1. **Chat Domain**  
   - Extract `NoticeList` component (current page render) + `useNoticeActions` hook (wrapping `useCreateNotice`, `useUpdateNotice`, `useDeleteNotice`).  
   - Create `DM` module with `DirectMessageDialog` and `useDirectMessageActions` for upload + message send error handling.
   - `ParticipantsList` → `ParticipantListSheet` with navigation to `/app/app/chat/participants`.

2. **Shared Notifications/Error Handling**  
   - Centralize Storage error mapping (quota, unauthorized) in `services/chat/storage.ts` to avoid duplication in `chat/page.tsx` and DM dialog.
   - Provide toast helper for standard success/error patterns.

3. **Auth/Session**  
   - Maintain cookie synchronization utilities (`lib/cookies.ts`).  
   - Consider `services/auth/session.ts` to unify cookie + localStorage updates when login/logout occurs.

4. **Data Center Layer**  
   - Associate `hooks/datacntr` with service modules; ensure tables/dashboards consume typed data objects.

## 5. Next Steps
- Stage 3에서 `/app/chat` 리팩토링 시 위 구조를 적용.  
- Stage 2 완료 전에 인벤토리 및 구조안을 Context7 노트와 `docs/architecture/stage2-inventory.md`에 반영(현재 문서).  
- Firestore Emulator 스모크 테스트 실행 후 항목 6 추가 예정.
