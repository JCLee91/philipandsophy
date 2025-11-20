/**
 * Firebase Cloud Functions Entry Point
 *
 * This file only exports functions - actual implementations are in separate files.
 * This keeps the entry point lightweight and avoids deployment timeout issues.
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";

// Initialize Firebase Admin
admin.initializeApp();

// Global options for all functions
setGlobalOptions({
  region: "asia-northeast3", // Seoul, South Korea
  maxInstances: 10,
});

// ============================================================
// Firestore Triggers
// ============================================================

export { onMessageCreated } from "./triggers/on-message-created";
export { onNoticeCreated } from "./triggers/on-notice-created";
export { onNoticeUpdated } from "./triggers/on-notice-updated";

// ============================================================
// Scheduled Functions
// ============================================================

export { publishScheduledNotices } from "./scheduled-notices";

// ✅ AI SDK는 이미 lazy import로 구현되어 배포 타임아웃 해결됨
export { scheduledClusterMatching } from "./scheduled-cluster-matching";

// ============================================================
// HTTP Functions
// ============================================================

export { sendCustomNotification } from "./custom-notifications";
