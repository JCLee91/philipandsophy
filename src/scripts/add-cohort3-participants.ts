/**
 * 3기 참가자 추가 (정재환, 이민우)
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app, 'seoul');
const bucket = getStorage(app).bucket();

const participants = [
  { id: 'cohort3-재환', name: '정재환', phoneNumber: '01050538358' },
  { id: 'cohort3-민우', name: '이민우', phoneNumber: '01027615193' },
];

async function addParticipants() {
  console.log('👥 3기 참가자 추가 시작...\n');

  try {
    for (const p of participants) {
      console.log(`\n👤 ${p.name} (${p.id})`);
      console.log('==================\n');

      const data = {
        cohortId: '3',
        name: p.name,
        phoneNumber: p.phoneNumber,
        gender: null,
        firebaseUid: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // 1. Firestore 추가
      console.log('📝 1. Firestore 추가...');
      const ref = db.collection('participants').doc(p.id);
      await ref.set(data);
      console.log('✅ 완료');

      // 2. Storage 이미지 찾기
      console.log('\n📂 2. Storage 이미지 확인...');
      const [files] = await bucket.getFiles({ prefix: 'cohorts/cohort3/profiles/' });

      let fullUrl: string | null = null;
      let circleUrl: string | null = null;

      files.forEach((file) => {
        const fn = file.name.normalize('NFC');
        if (fn.includes(`Profile_3기_${p.name}.png`) && !fn.includes('_1200x1200')) {
          fullUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
        }
        if (fn.includes(`Circle_3기_${p.name}.png`) && !fn.includes('_1200x1200')) {
          circleUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
        }
      });

      // 3. 이미지 연결
      if (fullUrl || circleUrl) {
        console.log('🔗 3. 이미지 연결...');
        const imgData: any = { updatedAt: Timestamp.now() };
        if (fullUrl) {
          imgData.profileImage = fullUrl;
          console.log('   Full: ✅');
        }
        if (circleUrl) {
          imgData.profileImageCircle = circleUrl;
          console.log('   Circle: ✅');
        }
        await ref.update(imgData);
      }
    }

    console.log('\n🎉 완료!');
  } catch (error) {
    console.error('\n❌ 에러:', error);
  }
}

addParticipants();
