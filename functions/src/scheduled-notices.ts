import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "./lib/logger";
import { getSeoulDB } from "./lib/db-helper";

/**
 * Scheduled function to publish notices that are scheduled for release.
 * Runs every 10 minutes.
 */
export const publishScheduledNotices = onSchedule(
  {
    schedule: "*/10 * * * *", // Every 10 minutes
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    logger.info("Starting scheduled notice publication check");

    const db = getSeoulDB();
    const now = admin.firestore.Timestamp.now();

    // 디버깅: 현재 시간 로깅
    logger.info(`Current time (UTC): ${now.toDate().toISOString()}`);
    logger.info(`Current time (KST): ${now.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

    try {
      // 먼저 모든 scheduled 상태의 공지를 가져와서 확인 (디버깅용)
      const allScheduledSnapshot = await db
        .collection("notices")
        .where("status", "==", "scheduled")
        .get();

      logger.info(`Total scheduled notices in DB: ${allScheduledSnapshot.size}`);

      allScheduledSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const scheduledAt = data.scheduledAt?.toDate?.();
        logger.info(`Notice ${doc.id}: scheduledAt=${scheduledAt?.toISOString() || 'undefined'}, isPast=${scheduledAt ? scheduledAt <= now.toDate() : 'N/A'}`);
      });

      // Query for notices that are scheduled and due for publication
      const noticesSnapshot = await db
        .collection("notices")
        .where("status", "==", "scheduled")
        .where("scheduledAt", "<=", now)
        .get();

      if (noticesSnapshot.empty) {
        logger.info("No scheduled notices to publish");
        return;
      }

      logger.info(`Found ${noticesSnapshot.size} scheduled notices to publish`);

      const batch = db.batch();
      let updateCount = 0;

      noticesSnapshot.docs.forEach((doc) => {
        const noticeRef = db.collection("notices").doc(doc.id);
        batch.update(noticeRef, {
          status: "published",
          updatedAt: now,
        });
        updateCount++;
      });

      await batch.commit();
      logger.info(`Successfully published ${updateCount} notices`);
      
    } catch (error) {
      logger.error("Error publishing scheduled notices", error as Error);
    }
  }
);
