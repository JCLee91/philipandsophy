/**
 * 3기 참가자 ID 확인
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase Admin SDK 초기화
const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function checkParticipants() {
  console.log('👥 3기 참가자 ID 확인 중...\n');

  try {
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', '3')
      .get();

    console.log(`총 ${participantsSnapshot.size}명의 참가자\n`);
    console.log('==================\n');

    participantsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   이름: ${data.name}`);
      console.log(`   전화: ${data.phoneNumber}`);
      console.log(`   성별: ${data.gender || 'N/A'}`);
      console.log(`   관리자: ${data.isAdministrator ? 'Yes' : 'No'}`);
      console.log(`   고스트: ${data.isGhost ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('✅ 확인 완료');
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkParticipants();
