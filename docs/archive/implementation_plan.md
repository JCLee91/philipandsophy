# Implementation Plan: Scheduled Notices (Archive)

This document is an implementation snapshot from a previous iteration.

## Goal Description
Allow administrators to schedule notices for future publication. Scheduled notices will automatically be published and push notifications sent at the specified time.

## User Review Required
> [!NOTE]
> **Scheduling Precision:** The scheduler will run every **30 minutes**. This means a notice scheduled for 10:05 might be published between 10:00 and 10:30 depending on the cron execution.
> **Status Change:** A new status `scheduled` will be introduced.

## Proposed Changes

### 1. Database & Types
#### [MODIFY] `src/types/database.ts`
-   Update `Notice` interface:
    -   Update `status` to `'draft' | 'published' | 'scheduled'`.
    -   Add `scheduledAt?: Timestamp`.

### 2. Cloud Functions
#### [NEW] `functions/src/scheduled-notices.ts`
-   Create `publishScheduledNotices` function.
-   Schedule: Every 30 minutes (`*/30 * * * *`).
-   Logic:
    -   Query `notices` where `status == 'scheduled'` and `scheduledAt <= now`.
    -   Update `status` to `'published'`.
    -   Update `updatedAt` to now.

#### [MODIFY] `functions/src/index.ts`
-   Export `publishScheduledNotices`.
-   Update `onNoticeUpdated` to trigger push notifications when status changes from `scheduled` to `published`.

### 3. Data Center UI
#### [MODIFY] `src/app/datacntr/notices/create/page.tsx`
-   Add "Schedule Publication" (예약 발행) option.
-   Add Date/Time picker (native `datetime-local` input).
-   If scheduled, submit with `status: 'scheduled'` and `scheduledAt`.

#### [MODIFY] `src/app/datacntr/notices/edit/[noticeId]/page.tsx`
-   Support `scheduled` status.
-   Allow modifying `scheduledAt`.

#### [MODIFY] `src/components/datacntr/NoticeCard.tsx`
-   Display "Scheduled" badge and time for scheduled notices.

### 4. API
#### [MODIFY] `src/app/api/datacntr/notices/create/route.ts`
-   Handle `scheduledAt` and `status: 'scheduled'`.

#### [MODIFY] `src/app/api/datacntr/notices/[noticeId]/route.ts`
-   Handle `scheduledAt` and `status: 'scheduled'`.

## Verification Plan

### Automated Tests
-   N/A (Cloud Functions require deployment to test fully).

### Manual Verification
1.  **Schedule Notice:** Create a notice scheduled for 5 minutes from now.
2.  **Verify Status:** Check list to see it marked as "Scheduled".
3.  **Wait:** Wait for the scheduler to run (or manually trigger if possible/mocked).
4.  **Verify Publish:** Check if status changes to "Published".
5.  **Verify Push:** Confirm push notification is received.
