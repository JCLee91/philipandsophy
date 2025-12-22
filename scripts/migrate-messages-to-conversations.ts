/**
 * 마이그레이션 스크립트: 기존 메시지 데이터를 기반으로 conversations 컬렉션 생성
 * 
 * 실행: npx tsx scripts/migrate-messages-to-conversations.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(admin.app());

interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: admin.firestore.Timestamp;
}

interface ConversationData {
  id: string;
  participantId: string;
  lastMessage: string;
  lastMessageAt: admin.firestore.Timestamp;
  adminUnreadCount: number;
  userInfo?: {
    name: string;
    profileImage?: string;
    profileImageCircle?: string;
    cohortId?: string;
    cohortName?: string;
  };
}

async function migrateMessages() {
  console.log('🚀 Starting migration: messages -> conversations');

  try {
    // 1. 모든 메시지 가져오기
    console.log('📦 Fetching all messages...');
    const messagesSnapshot = await db.collection('messages').get();
    console.log(`✅ Found ${messagesSnapshot.size} messages.`);

    if (messagesSnapshot.empty) {
      console.log('⚠️ No messages found. Exiting.');
      return;
    }

    // 2. 대화방별로 메시지 그룹화
    const messagesByConversation = new Map<string, MessageData[]>();

    messagesSnapshot.docs.forEach((doc: any) => {
      const data = doc.data() as MessageData;
      // 문서 ID 포함
      const message = { ...data, id: doc.id };
      
      if (!messagesByConversation.has(data.conversationId)) {
        messagesByConversation.set(data.conversationId, []);
      }
      messagesByConversation.get(data.conversationId)?.push(message);
    });

    console.log(`conversation groups: ${messagesByConversation.size}`);

    // 3. 각 대화방에 대해 Conversation 데이터 생성
    let batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 400; // Safety margin

    // 캐시용 맵 (중복 조회 방지)
    const participantCache = new Map<string, any>();
    const cohortCache = new Map<string, string>();

    for (const [conversationId, messages] of messagesByConversation) {
      // 메시지 시간순 정렬 (오래된 -> 최신)
      messages.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      
      const lastMessageDoc = messages[messages.length - 1];
      
      // adminUnreadCount 계산: receiverId가 'admin'이고 읽지 않은 메시지
      // 또는 관리자가 수신자인 경우를 포괄적으로 판단해야 함.
      // conversationId는 {userId}-admin 형식이므로, participantId는 앞부분
      const participantId = conversationId.replace('-admin', '');
      
      // 참가자가 보낸 메시지 중 안 읽은 것 카운트
      // senderId가 participantId인 것들 중 isRead: false
      const adminUnreadCount = messages.filter(
        m => m.senderId === participantId && !m.isRead
      ).length;

      // 참가자 정보 조회
      let userData: any = null;
      let cohortName = '';

      if (participantId) {
        if (participantCache.has(participantId)) {
          userData = participantCache.get(participantId);
        } else {
          const userDoc = await db.collection('participants').doc(participantId).get();
          if (userDoc.exists) {
            userData = userDoc.data();
            participantCache.set(participantId, userData);
          }
        }
      }

      // 기수 정보 조회
      if (userData?.cohortId) {
        if (cohortCache.has(userData.cohortId)) {
          cohortName = cohortCache.get(userData.cohortId) || '';
        } else {
          const cohortDoc = await db.collection('cohorts').doc(userData.cohortId).get();
          if (cohortDoc.exists) {
            const cData = cohortDoc.data();
            cohortName = cData?.name || '';
            cohortCache.set(userData.cohortId, cohortName);
          }
        }
      }

      // Conversation 문서 데이터 구성
      const conversationData: ConversationData = {
        id: conversationId,
        participantId,
        lastMessage: lastMessageDoc.imageUrl ? '📷 사진' : lastMessageDoc.content,
        lastMessageAt: lastMessageDoc.createdAt,
        adminUnreadCount,
        userInfo: userData ? {
          name: userData.name,
          profileImage: userData.profileImage || userData.profileImageCircle || '',
          profileImageCircle: userData.profileImageCircle || '',
          cohortId: userData.cohortId,
          cohortName: cohortName
        } : undefined
      };

      const convRef = db.collection('conversations').doc(conversationId);
      batch.set(convRef, conversationData);
      batchCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} conversations...`);
        batch = db.batch(); // Create new batch
        batchCount = 0;
      }
    }

    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} conversations.`);
    }

    console.log('✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// 실행
migrateMessages().then(() => process.exit(0));

