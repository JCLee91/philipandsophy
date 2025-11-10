/**
 * 독서 인증 이미지 업로드 스크립트
 *
 * 실행: npx tsx scripts/upload-submission-image.ts
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app, 'seoul');
const bucket = getStorage(app).bucket();

async function uploadImage() {
  try {
    const documentId = 'CqsqnmmAYla7MaqLcP9Y'; // 방금 생성한 문서 ID
    const participantId = 'cohort3-지현';
    const localImagePath = '/var/folders/wl/z71wqjq561538z18s6b_k77w0000gn/T/tmp-24-1731229621764'; // 임시 이미지 경로

    console.log('📸 이미지 업로드 시작...\n');

    // 1. 파일 존재 확인
    if (!fs.existsSync(localImagePath)) {
      throw new Error(`이미지 파일을 찾을 수 없습니다: ${localImagePath}`);
    }

    // 2. Storage 경로 설정
    const timestamp = Date.now();
    const storagePath = `reading_submissions/${participantId}/${timestamp}.jpg`;

    console.log(`📁 업로드 경로: ${storagePath}`);

    // 3. Firebase Storage에 업로드
    await bucket.upload(localImagePath, {
      destination: storagePath,
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          participantId,
          submissionId: documentId,
        },
      },
    });

    console.log('✅ Storage 업로드 완료');

    // 4. Public URL 생성
    const file = bucket.file(storagePath);
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    console.log(`🔗 Public URL: ${publicUrl}`);

    // 5. Firestore 문서 업데이트
    await db.collection('reading_submissions').doc(documentId).update({
      bookImageUrl: publicUrl,
    });

    console.log('✅ Firestore 문서 업데이트 완료');
    console.log(`\n✅ 모든 작업 완료! Document ID: ${documentId}`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
uploadImage()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
