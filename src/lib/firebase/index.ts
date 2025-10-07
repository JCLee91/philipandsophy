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
} from './client';

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
  updateParticipantBookTitle,
  deleteParticipant,
  searchParticipants,
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
  updateSubmissionStatus,
  deleteSubmission,
  searchSubmissions,
  subscribeTodayVerified,
  getApprovedSubmissionsByParticipant,
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
  toggleNoticePin,
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

// Types
export type { Cohort, Participant, ReadingSubmission, Notice, DirectMessage } from '@/types/database';
export { COLLECTIONS } from '@/types/database';
