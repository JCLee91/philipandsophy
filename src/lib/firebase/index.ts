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
  createCohort,
  createCohortWithId,
  getCohortById,
  getAllCohorts,
  getActiveCohorts,
  updateCohort,
  deleteCohort,
} from './cohorts';

// Participant operations
export {
  createParticipant,
  getParticipantById,
  getParticipantByPhoneNumber,
  getParticipantsByCohort,
  getAllParticipants,
  updateParticipant,
  updateParticipantBookInfo,
  deleteParticipant,
  searchParticipants,
  // Firebase Auth 관련
  getParticipantByFirebaseUid,
  linkFirebaseUid,
} from './participants';

// Submission operations
export {
  createSubmission,
  getSubmissionById,
  getSubmissionsByParticipant,
  getSubmissionsByCode,
  getAllSubmissions,
  getSubmissionsByStatus,
  updateSubmission,
  deleteSubmission,
  searchSubmissions,
  subscribeTodayVerified,
  subscribeParticipantSubmissions,
  saveDraft,
  deleteDraft,
} from './submissions';

// Storage operations
export {
  uploadFile,
  uploadFileWithProgress,
  uploadMultipleFiles,
  uploadReadingImage,
  deleteFile,
  deleteMultipleFiles,
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
  copyDailyQuestions,
} from './daily-questions';

// Types
export type { Cohort, Participant, ReadingSubmission, Notice, DirectMessage, DailyQuestion } from '@/types/database';
export { COLLECTIONS } from '@/types/database';
