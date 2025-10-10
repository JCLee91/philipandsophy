'use client';

/**
 * Firebase Messages Operations
 * Direct messaging functionality for participant-to-participant and participant-to-admin communication
 */

import {
  collection,
  doc,
  addDoc,
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
} from 'firebase/firestore';
import { getDb } from './client';
import type { DirectMessage } from '@/types/database';
import { COLLECTIONS } from '@/types/database';

/**
 * Create a new direct message
 */
export const createMessage = async (data: {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrl?: string;
}): Promise<string> => {
  const db = getDb();
  const messagesRef = collection(db, COLLECTIONS.MESSAGES);

  const newMessage: Omit<DirectMessage, 'id'> = {
    conversationId: data.conversationId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    content: data.content.trim(),
    createdAt: Timestamp.now(),
    isRead: false,
    ...(data.imageUrl && { imageUrl: data.imageUrl }),
  };

  const docRef = await addDoc(messagesRef, newMessage);
  return docRef.id;
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
  if (snapshot.empty) return;

  const batch = writeBatch(db);

  snapshot.docs.forEach((document) => {
    batch.update(document.ref, { isRead: true });
  });

  await batch.commit();
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

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DirectMessage[];
    callback(messages);
  });
};

/**
 * Generate conversation ID between participant and admin
 * Format: {participantId}-admin
 */
export const getConversationId = (participantId: string): string => {
  return `${participantId}-admin`;
};
