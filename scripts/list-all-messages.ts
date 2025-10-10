/**
 * 모든 DM 메시지 리스트 조회
 * conversationId별로 그룹화하여 표시
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listAllMessages() {
  console.log('🔍 Fetching all DM messages from Firestore...\n');

  try {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);

    console.log(`📊 Total messages found: ${snapshot.size}\n`);

    if (snapshot.empty) {
      console.log('❌ No messages found in database');
      return;
    }

    // conversationId별로 그룹화
    const conversations = new Map<string, any[]>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const convId = data.conversationId;

      if (!conversations.has(convId)) {
        conversations.set(convId, []);
      }

      conversations.get(convId)!.push({
        id: doc.id,
        ...data,
      });
    });

    console.log(`💬 Total conversations: ${conversations.size}\n`);
    console.log('━'.repeat(80));

    // 각 conversation 출력
    conversations.forEach((messages, convId) => {
      console.log(`\n📍 Conversation: ${convId}`);
      console.log(`   Messages: ${messages.length}`);
      console.log(`   Participants:`);

      const senders = new Set(messages.map((m) => m.senderId));
      const receivers = new Set(messages.map((m) => m.receiverId));
      const allParticipants = new Set([...senders, ...receivers]);

      allParticipants.forEach((p) => {
        console.log(`     - ${p}`);
      });

      console.log(`\n   Latest message:`);
      const latest = messages[0]; // 이미 desc 정렬됨
      console.log(`     From: ${latest.senderId}`);
      console.log(`     To: ${latest.receiverId}`);
      console.log(`     Content: "${latest.content?.substring(0, 50)}${latest.content?.length > 50 ? '...' : ''}"`);
      console.log(`     Date: ${latest.createdAt?.toDate?.() || latest.createdAt}`);
      console.log('');
    });

    console.log('━'.repeat(80));
    console.log('\n✅ Message list complete\n');

  } catch (error) {
    console.error('❌ Error listing messages:', error);
  }
}

listAllMessages().then(() => process.exit(0));
