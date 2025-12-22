/**
 * 퍼널 이벤트 초기화 스크립트
 *
 * funnel_events 컬렉션의 모든 문서를 삭제합니다.
 * 퍼널 구조 변경 후 새로 집계를 시작할 때 사용합니다.
 *
 * 실행 방법:
 * npx tsx src/scripts/reset-funnel-events.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * 배치 단위로 문서 삭제 (Firestore 제한: 500개씩)
 */
async function deleteAllDocuments(collectionPath: string) {
  const collectionRef = collection(db, collectionPath);
  const snapshot = await getDocs(collectionRef);

  if (snapshot.empty) {
    return 0;
  }

  const docs = snapshot.docs;
  let totalDeleted = 0;

  // 500개씩 배치로 삭제
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);

    chunk.forEach((docSnap) => {
      batch.delete(doc(db, collectionPath, docSnap.id));
    });

    await batch.commit();
    totalDeleted += chunk.length;
    console.log(`   🗑️  ${totalDeleted}/${docs.length}개 삭제됨...`);
  }

  return totalDeleted;
}

/**
 * 퍼널 이벤트 초기화 실행
 */
async function resetFunnelEvents() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 퍼널 이벤트 초기화 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 현재 문서 수 확인
    const collectionRef = collection(db, 'funnel_events');
    const snapshot = await getDocs(collectionRef);
    const totalDocs = snapshot.size;

    console.log(`📊 현재 funnel_events 문서 수: ${totalDocs}개\n`);

    if (totalDocs === 0) {
      console.log('⚠️  삭제할 문서가 없습니다.');
      return;
    }

    // 삭제 실행
    console.log('🗑️  삭제 중...');
    const deletedCount = await deleteAllDocuments('funnel_events');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 초기화 완료!`);
    console.log(`   삭제된 문서: ${deletedCount}개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
resetFunnelEvents()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
