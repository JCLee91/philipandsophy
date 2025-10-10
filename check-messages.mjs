import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Firebase 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function checkMessages() {
  console.log('\n=== 김민준, 이윤지 DM 메시지 확인 ===\n');

  // 1. 참가자 정보 먼저 확인
  const participantsSnapshot = await db.collection('participants')
    .where('name', 'in', ['김민준', '이윤지'])
    .get();

  const participants = {};
  participantsSnapshot.forEach(doc => {
    const data = doc.data();
    participants[data.name] = {
      id: doc.id,
      name: data.name,
      isAdmin: data.isAdmin || false
    };
    console.log(`참가자: ${data.name} (ID: ${doc.id}, Admin: ${data.isAdmin || false})`);
  });

  console.log('\n--- 메시지 조회 ---\n');

  // 2. 김민준, 이윤지와 관련된 모든 메시지 조회
  const messagesSnapshot = await db.collection('messages').get();

  const relevantMessages = [];
  messagesSnapshot.forEach(doc => {
    const msg = { id: doc.id, ...doc.data() };
    const isRelevant =
      msg.senderId === participants['김민준']?.id ||
      msg.receiverId === participants['김민준']?.id ||
      msg.senderId === participants['이윤지']?.id ||
      msg.receiverId === participants['이윤지']?.id ||
      msg.conversationId.includes(participants['김민준']?.id || 'xxx') ||
      msg.conversationId.includes(participants['이윤지']?.id || 'xxx');

    if (isRelevant) {
      relevantMessages.push(msg);
    }
  });

  console.log(`총 관련 메시지: ${relevantMessages.length}개\n`);

  // conversationId별로 그룹화
  const byConversation = {};
  relevantMessages.forEach(msg => {
    if (!byConversation[msg.conversationId]) {
      byConversation[msg.conversationId] = [];
    }
    byConversation[msg.conversationId].push(msg);
  });

  // 각 대화방별로 출력
  for (const [convId, messages] of Object.entries(byConversation)) {
    console.log(`\n📬 Conversation ID: ${convId}`);
    console.log(`   총 ${messages.length}개 메시지`);

    const unreadCount = messages.filter(m => !m.isRead).length;
    console.log(`   미읽음: ${unreadCount}개\n`);

    // 미읽은 메시지만 상세 출력
    const unreadMessages = messages.filter(m => !m.isRead);
    if (unreadMessages.length > 0) {
      console.log('   🔴 미읽은 메시지:');
      unreadMessages.forEach((msg, idx) => {
        const createdAt = msg.createdAt?.toDate?.() || new Date(msg.createdAt._seconds * 1000);
        console.log(`      ${idx + 1}. [${createdAt.toLocaleString('ko-KR')}]`);
        console.log(`         송신자: ${msg.senderId}`);
        console.log(`         수신자: ${msg.receiverId}`);
        console.log(`         내용: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        console.log(`         isRead: ${msg.isRead}`);
      });
    }

    // 읽은 메시지 요약
    const readCount = messages.filter(m => m.isRead).length;
    if (readCount > 0) {
      console.log(`\n   ✅ 읽은 메시지: ${readCount}개`);
    }
  }

  console.log('\n=== 조회 완료 ===\n');
  process.exit(0);
}

checkMessages().catch(console.error);
