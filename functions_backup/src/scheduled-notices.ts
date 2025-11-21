import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "./lib/logger";
import { getSeoulDB } from "./lib/db-helper";

/**
 * Scheduled function to publish notices that are scheduled for release.
 * Runs every 30 minutes.
 */
export const publishScheduledNotices = onSchedule(
  {
    schedule: "*/30 * * * *", // Every 30 minutes
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    logger.info("Starting scheduled notice publication check");

    const db = getSeoulDB();
    const now = admin.firestore.Timestamp.now();

    try {
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
