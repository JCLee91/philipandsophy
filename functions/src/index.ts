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

// ⚠️ TEMPORARILY DISABLED: Lazy loading issue with AI SDK during deployment
// TODO: Re-enable after fixing deployment timeout
// export { scheduledClusterMatching } from "./scheduled-cluster-matching";

// ============================================================
// HTTP Functions
// ============================================================

// ⚠️ TEMPORARILY DISABLED: Heavy imports causing memory issues during deployment
// TODO: Re-enable after optimizing or splitting into separate codebase
// export { sendCustomNotification } from "./custom-notifications";

// ⚠️ TEMPORARILY DISABLED: Heavy function causing deployment timeout
// TODO: Move to separate entry point or optimize
// export { manualMatchingPreview } from "./http/manual-matching-preview";
