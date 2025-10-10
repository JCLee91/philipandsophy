/**
 * DM 메시지 디버깅 스크립트
 * 특정 conversationId의 메시지를 조회하여 문제 파악
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

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

async function checkMessages(conversationId: string) {
  console.log('🔍 Checking messages for conversation:', conversationId);
  console.log('━'.repeat(80));

  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);

    console.log(`\n📊 Total messages found: ${snapshot.size}\n`);

    if (snapshot.empty) {
      console.log('❌ No messages found for this conversation');
      return;
    }

    let index = 0;
    snapshot.forEach((doc) => {
      index++;
      const data = doc.data();
      console.log(`Message #${index}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  conversationId: ${data.conversationId}`);
      console.log(`  senderId: ${data.senderId}`);
      console.log(`  receiverId: ${data.receiverId}`);
      console.log(`  content: "${data.content?.substring(0, 50)}${data.content?.length > 50 ? '...' : ''}"`);
      console.log(`  imageUrl: ${data.imageUrl || 'none'}`);
      console.log(`  isRead: ${data.isRead}`);
      console.log(`  createdAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
      console.log('');
    });

    console.log('━'.repeat(80));
    console.log('\n✅ Message check complete\n');

  } catch (error) {
    console.error('❌ Error checking messages:', error);
  }
}

// 실행
const conversationId = process.argv[2];

if (!conversationId) {
  console.error('Usage: npm run check:messages <conversationId>');
  console.error('Example: npm run check:messages user-junyoung-admin');
  process.exit(1);
}

checkMessages(conversationId).then(() => process.exit(0));
