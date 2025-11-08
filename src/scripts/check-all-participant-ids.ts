/**
 * 전체 참가자 ID 형식 확인
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function checkAllParticipants() {
  console.log('👥 전체 참가자 ID 형식 확인...\n');

  try {
    for (const cohortId of ['1', '2', '3']) {
      console.log(`\n📋 ${cohortId}기 참가자:`);
      console.log('==================');

      const snapshot = await db
        .collection('participants')
        .where('cohortId', '==', cohortId)
        .limit(5) // 처음 5명만
        .get();

      console.log(`총 ${snapshot.size}명 (처음 5명만 표시)\n`);

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   이름: ${data.name}`);
        console.log('');
      });
    }

    console.log('✅ 확인 완료');
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkAllParticipants();
