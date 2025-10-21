/**
 * 저자 필드가 비어있는 제출 데이터 확인
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';

const db = getAdminDb();

async function checkEmptyAuthors() {
  console.log('\n📚 어제 제출 데이터 중 저자 없는 데이터 확인...\n');

  const yesterdayDate = '2025-10-20';

  const snapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterdayDate)
    .get();

  console.log(`📊 어제(${yesterdayDate}) 총 제출 데이터: ${snapshot.size}개\n`);

  const emptyAuthors: string[] = [];
  const hasAuthors: string[] = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const author = data.bookAuthor;

    if (!author || author === 'undefined' || author.trim() === '') {
      emptyAuthors.push(data.participantId);
      console.log(`❌ ${data.participantId}: 저자 없음 - "${data.bookTitle}"`);
    } else {
      hasAuthors.push(data.participantId);
    }
  });

  console.log(`\n📊 결과:`);
  console.log(`   - 저자 있음: ${hasAuthors.length}명`);
  console.log(`   - 저자 없음: ${emptyAuthors.length}명`);

  if (emptyAuthors.length > 0) {
    console.log(`\n❌ 저자 없는 참가자 목록:`);
    emptyAuthors.forEach((id, idx) => {
      console.log(`   ${idx + 1}. ${id}`);
    });
  }

  console.log(`\n✅ 확인 완료\n`);
}

checkEmptyAuthors()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
