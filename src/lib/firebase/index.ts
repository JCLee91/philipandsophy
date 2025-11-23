'use client';

/**
 * Firebase Main Export
 * Central export point for all Firebase functionality
 */

// Client initialization
export {
  initializeFirebase,
  getDb,
  getStorageInstance,
  getFirebaseApp,
  getFirebaseAuth,
} from './client';

// Phone Authentication
export {
  initRecaptcha,
  sendSmsVerification,
  confirmSmsCode,
  signOut,
} from './auth';

// Cohort operations
export {
  createCohortWithId,
  getCohortById,
  getAllCohorts,
  getActiveCohorts,
  updateCohort,
  subscribeToCohort,
} from './cohorts';

// Participant operations
export {
  createParticipant,
  getParticipantById,
  getParticipantByPhoneNumber,
  getAllParticipantsByPhoneNumber,
  getParticipantsByCohort,
  updateParticipant,
  updateParticipantBookInfo,
  // Firebase Auth 관련
  getParticipantByFirebaseUid,
  linkFirebaseUid,
  unlinkFirebaseUid,
  subscribeToCohortParticipants,
} from './participants';

// Submission operations
export {
  createSubmission,
  getSubmissionById,
  getSubmissionsByParticipant,
  updateSubmission,
  deleteSubmission,
  subscribeTodayVerified,
  subscribeParticipantSubmissions,
  saveDraft,
  deleteDraft,
} from './submissions';

// Storage operations
export {
  uploadFileWithProgress,
  uploadReadingImage,
} from './storage';

// Notice operations
export {
  createNotice,
  getNoticeById,
  getNoticesByCohort,
  getAllNotices,
  updateNotice,
  deleteNotice,
  searchNotices,
  subscribeToNoticesByCohort,
} from './notices';

// Message operations
export {
  createMessage,
  getMessagesByConversation,
  getMessagesBySender,
  getMessagesByReceiver,
  getUnreadCount,
  getTotalUnreadCount,
  markConversationAsRead,
  markMessageAsRead,
  deleteMessage,
  getAdminConversations,
  subscribeToMessages,
  getConversationId,
} from './messages';

// Daily Questions operations
export {
  getDailyQuestion,
  getDailyQuestionText,
  getAllDailyQuestions,
  createDailyQuestions,
} from './daily-questions';

// Types
export type { Cohort, Participant, ReadingSubmission, Notice, DirectMessage, DailyQuestion } from '@/types/database';
export { COLLECTIONS } from '@/types/database';
