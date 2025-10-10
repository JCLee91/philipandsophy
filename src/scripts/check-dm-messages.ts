/**
 * Check DM Messages Script
 * Verifies DM messages for specific users
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Service Account 키 경로
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

// 키 파일 확인
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service Account 키 파일을 찾을 수 없습니다.');
  process.exit(1);
}

// Admin SDK 초기화
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkDMMessages() {
  const targetNames = ['김민준', '이윤지'];
  
  console.log('\n=== DM 메시지 확인 ===\n');

  // 1. 참가자 ID 조회
  console.log('📊 1. 참가자 정보 조회:\n');
  const participantsSnapshot = await db.collection('participants').get();
  
  const participants: Record<string, any> = {};
  const userIds: string[] = [];
  
  participantsSnapshot.forEach(doc => {
    const data = doc.data();
    if (targetNames.includes(data.name)) {
      participants[data.name] = {
        id: doc.id,
        name: data.name,
        isAdmin: data.isAdmin || false
      };
      userIds.push(doc.id);
      console.log(`   ✅ ${data.name} (ID: ${doc.id}, Admin: ${data.isAdmin || false})`);
    }
  });

  if (userIds.length === 0) {
    console.log('\n   ❌ 대상 참가자를 찾을 수 없습니다.\n');
    return;
  }

  console.log('\n📊 2. 메시지 조회:\n');

  // 2. 모든 메시지 조회
  const messagesSnapshot = await db.collection('messages').get();

  const relevantMessages: any[] = [];

  messagesSnapshot.forEach(doc => {
    const msg = { id: doc.id, ...doc.data() };
    
    // 김민준, 이윤지가 포함된 메시지만 필터링
    const isRelevant = userIds.some(id => 
      msg.senderId === id || 
      msg.receiverId === id || 
      msg.conversationId.includes(id)
    );
    
    if (isRelevant) {
      relevantMessages.push(msg);
    }
  });

  console.log(`   📬 총 관련 메시지: ${relevantMessages.length}개\n`);

  // 3. conversationId별로 그룹화
  const byConversation: Record<string, any[]> = {};
  relevantMessages.forEach(msg => {
    if (!byConversation[msg.conversationId]) {
      byConversation[msg.conversationId] = [];
    }
    byConversation[msg.conversationId].push(msg);
  });

  // 4. 각 대화방 출력
  Object.entries(byConversation).forEach(([convId, messages]) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 Conversation: ${convId}`);
    console.log(`   총 메시지: ${messages.length}개`);
    
    const unreadMessages = messages.filter((m: any) => !m.isRead);
    const readMessages = messages.filter((m: any) => m.isRead);
    
    console.log(`   🔴 미읽음: ${unreadMessages.length}개`);
    console.log(`   ✅ 읽음: ${readMessages.length}개`);

    if (unreadMessages.length > 0) {
      console.log('\n   🔴 미읽은 메시지 상세:');
      unreadMessages.forEach((msg: any, idx: number) => {
        const createdAt = msg.createdAt?.toDate?.();
        const senderName = Object.values(participants).find((p: any) => p.id === msg.senderId)?.name || msg.senderId;
        const receiverName = msg.receiverId === 'admin-team' ? '관리자팀' : 
          (Object.values(participants).find((p: any) => p.id === msg.receiverId)?.name || msg.receiverId);
        
        console.log(`\n      [${idx + 1}] 메시지 ID: ${msg.id}`);
        console.log(`          송신: ${senderName} (${msg.senderId})`);
        console.log(`          수신: ${receiverName} (${msg.receiverId})`);
        console.log(`          시간: ${createdAt?.toLocaleString('ko-KR') || 'N/A'}`);
        console.log(`          내용: "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}"`);
      });
    }
  });

  console.log('\n');
}

async function main() {
  try {
    await checkDMMessages();
    console.log('✅ 조회 완료!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
