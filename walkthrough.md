# Walkthrough - Push Notification Title for Notices

I have implemented an optional "Push Notification Title" field for notices. This allows administrators to customize the title of push notifications sent to users, while preserving the existing "chat-style" UI in the user app where titles are not displayed.

## Changes

### 1. Database & Types

#### [src/types/database.ts](file:///Users/jclee/Desktop/휠즈랩스/projectpns/src/types/database.ts)
-   Added `title?: string` to the `Notice` interface.

### 2. Data Center UI

#### [src/app/datacntr/notices/create/page.tsx](file:///Users/jclee/Desktop/휠즈랩스/projectpns/src/app/datacntr/notices/create/page.tsx)
-   Added a "Push Notification Title (Optional)" input field.
-   The field is clearly labeled to indicate it affects push notifications and admin views only.

#### [src/app/datacntr/notices/edit/[noticeId]/page.tsx](file:///Users/jclee/Desktop/휠즈랩스/projectpns/src/app/datacntr/notices/edit/[noticeId]/page.tsx)
-   Added the same title input field to the edit page.
-   Existing titles are loaded and can be modified.

#### [src/components/datacntr/NoticeCard.tsx](file:///Users/jclee/Desktop/휠즈랩스/projectpns/src/components/datacntr/NoticeCard.tsx)
-   Updated the admin notice list card to display the title (e.g., `[Title] Content...`) if one exists, making it easier for admins to identify notices.

### 3. API & Backend

#### [src/app/api/datacntr/notices/create/route.ts](file:///Users/jclee/Desktop/휠즈랩스/projectpns/src/app/api/datacntr/notices/create/route.ts)
-   Updated to parse the `title` from `FormData` and save it to Firestore.

#### [src/app/api/datacntr/notices/[noticeId]/route.ts](file:///Users/jclee/Desktop/휠즈랩스/projectpns/src/app/api/datacntr/notices/[noticeId]/route.ts)
-   Updated to parse the `title` and update the Firestore document.
-   Handles removal of the title (if cleared).
-   Fixed a lint error by importing `firebase-admin`.

### 4. Cloud Functions

#### [functions/src/index.ts](file:///Users/jclee/Desktop/휠즈랩스/projectpns/functions/src/index.ts)
-   Updated `onNoticeCreated` to use the custom `title` for push notifications.
-   Updated `onNoticeUpdated` to use the custom `title` when a draft is published.
-   Falls back to the default "새로운 공지가 등록되었습니다" if no title is provided.
-   Fixed a pre-existing lint error (`matchParticipantsRandomly` import).

## Verification Results

### Automated Checks
-   **Linting:** Fixed lint errors in `route.ts` and `index.ts`.

### Manual Verification Steps
1.  **Create Notice:**
    -   Go to Data Center > Notices > Create.
    -   Enter a "Push Title" (e.g., "Important Update").
    -   Enter content.
    -   Publish.
2.  **Verify Push:**
    -   Users should receive a push notification with the title "Important Update".
3.  **Verify Admin List:**
    -   The notice in the list should show `[Important Update] ...`.
4.  **Verify User App:**
    -   Open the app.
    -   The notice bubble should **ONLY** show the content, NOT the title.
