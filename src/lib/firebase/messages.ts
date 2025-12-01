'use client';

/**
 * Firebase Messages Operations
 * Direct messaging functionality for participant-to-participant and participant-to-admin communication
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  writeBatch,
  setDoc,
  increment,
} from 'firebase/firestore';
import { getDb } from './client';
import type { DirectMessage, Conversation } from '@/types/database';
import { COLLECTIONS } from '@/types/database';
import { generateMessageId } from './id-generator';

/**
 * Create a new direct message
 * ID 형식: msg_{senderId}_{MMDD}_{HHmmss}
 * 예: msg_cohort4-은지_1201_143025, msg_admin_1201_143025
 */
export const createMessage = async (data: {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrl?: string;
}): Promise<string> => {
  const db = getDb();

  // 커스텀 ID 생성 (senderId 기반)
  const customId = generateMessageId(data.senderId);

  const newMessage: Omit<DirectMessage, 'id'> = {
    conversationId: data.conversationId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    content: data.content.trim(),
    createdAt: Timestamp.now(),
    isRead: false,
    ...(data.imageUrl && { imageUrl: data.imageUrl }),
  };

  const docRef = doc(db, COLLECTIONS.MESSAGES, customId);
  await setDoc(docRef, newMessage);

  // Update conversation metadata for Admin Inbox
  try {
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, data.conversationId);
    const participantId = data.conversationId.replace('-admin', '');
    const isFromUser = data.senderId === participantId;

    const updateData: any = {
      lastMessage: data.imageUrl ? '📷 사진' : data.content.trim(),
      lastMessageAt: newMessage.createdAt,
      participantId,
      id: data.conversationId
    };

    if (isFromUser) {
      updateData.adminUnreadCount = increment(1);
    }

    await updateDoc(conversationRef, updateData);
  } catch (error: any) {
    // If document not found, create it with user info
    if (error.code === 'not-found') {
      const participantId = data.conversationId.replace('-admin', '');
      const isFromUser = data.senderId === participantId;
      
      // Fetch user and cohort info
      const userDoc = await getDoc(doc(db, COLLECTIONS.PARTICIPANTS, participantId));
      const userData = userDoc.data();
      let cohortName = '';
      
      if (userData?.cohortId) {
        const cohortDoc = await getDoc(doc(db, COLLECTIONS.COHORTS, userData.cohortId));
        cohortName = cohortDoc.data()?.name || '';
      }

      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, data.conversationId);
      await setDoc(conversationRef, {
        id: data.conversationId,
        participantId,
        lastMessage: data.imageUrl ? '📷 사진' : data.content.trim(),
        lastMessageAt: newMessage.createdAt,
        adminUnreadCount: isFromUser ? 1 : 0,
        userInfo: userData ? {
          name: userData.name,
          profileImage: userData.profileImage || userData.profileImageCircle || '',
          profileImageCircle: userData.profileImageCircle || '',
          cohortId: userData.cohortId,
          cohortName
        } : undefined
      });
    } else {
      console.error('Failed to update conversation metadata:', error);
    }
  }

  return customId;
};

/**
 * Get all messages for a conversation
 */
export const getMessagesByConversation = async (
  conversationId: string
): Promise<DirectMessage[]> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DirectMessage[];
};

/**
 * Get messages sent by a specific user
 */
export const getMessagesBySender = async (
  senderId: string
): Promise<DirectMessage[]> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);
  const q = query(
    messagesRef,
    where('senderId', '==', senderId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DirectMessage[];
};

/**
 * Get messages received by a specific user
 */
export const getMessagesByReceiver = async (
  receiverId: string
): Promise<DirectMessage[]> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);
  const q = query(
    messagesRef,
    where('receiverId', '==', receiverId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DirectMessage[];
};

/**
 * Get unread message count for a user in a conversation
 */
export const getUnreadCount = async (
  conversationId: string,
  userId: string
): Promise<number> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);

  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    where('receiverId', '==', userId),
    where('isRead', '==', false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Get total unread message count for a user (all conversations)
 */
export const getTotalUnreadCount = async (userId: string): Promise<number> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);
  const q = query(
    messagesRef,
    where('receiverId', '==', userId),
    where('isRead', '==', false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Mark all messages in a conversation as read for a specific user
 */
export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);

  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    where('receiverId', '==', userId),
    where('isRead', '==', false)
  );

  const snapshot = await getDocs(q);

  // 업데이트할 메시지가 없으면 early return (빈 배치 방지)
  if (snapshot.empty) {

    return;
  }

  const batch = writeBatch(db);

  snapshot.docs.forEach((document) => {
    batch.update(document.ref, { isRead: true });
  });

  await batch.commit();

  // Reset admin unread count if the reader is admin
  const participantId = conversationId.replace('-admin', '');
  if (userId !== participantId) {
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    await updateDoc(conversationRef, {
      adminUnreadCount: 0
    }).catch(error => {
      // It's okay if conversation doesn't exist (rare case)
      if (error.code !== 'not-found') {
        console.warn('Failed to reset admin unread count:', error);
      }
    });
  }
};

/**
 * Mark a specific message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  const db = getDb();
  const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
  await updateDoc(messageRef, { isRead: true });
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  const db = getDb();
  const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
  await deleteDoc(messageRef);
};

/**
 * Get all conversations for admin (distinct conversation IDs)
 */
export const getAdminConversations = async (): Promise<string[]> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);
  const q = query(
    messagesRef,
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const conversations = new Set<string>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    conversations.add(data.conversationId);
  });

  return Array.from(conversations);
};

/**
 * Subscribe to real-time messages for a conversation
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: DirectMessage[]) => void
): (() => void) => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DirectMessage[];
      callback(messages);
    },
    (error) => {

      callback([]); // Fallback to empty array on error
    }
  );
};

/**
 * Generate conversation ID between participant and admin
 * Format: {participantId}-admin
 */
export const getConversationId = (participantId: string): string => {
  return `${participantId}-admin`;
};

/**
 * Subscribe to real-time admin conversations
 */
export const subscribeToAdminConversations = (
  callback: (conversations: Conversation[]) => void
): (() => void) => {
  const db = getDb();
  const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
  const q = query(
    conversationsRef,
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Conversation[];
      callback(conversations);
    },
    (error) => {
      console.error('Error fetching conversations:', error);
      callback([]);
    }
  );
};
