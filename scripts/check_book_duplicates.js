const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkBookDuplicates() {
  // 모든 인증 조회
  const submissionsSnapshot = await db.collection('reading_submissions').get();

  const bookTitles = new Map();

  submissionsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const bookTitle = data.bookTitle || '';

    if (bookTitle.trim().length > 0) {
      if (!bookTitles.has(bookTitle)) {
        bookTitles.set(bookTitle, { original: bookTitle, count: 1 });
      } else {
        bookTitles.get(bookTitle).count++;
      }
    }
  });

  console.log(`\n총 고유 책 제목 수: ${bookTitles.size}권\n`);

  // 비슷한 제목 찾기 (공백 차이)
  const titles = Array.from(bookTitles.keys());
  const duplicateCandidates = [];

  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      const t1 = titles[i].trim().replace(/\s+/g, ' ');
      const t2 = titles[j].trim().replace(/\s+/g, ' ');

      if (t1 === t2) {
        duplicateCandidates.push([titles[i], titles[j]]);
      }
    }
  }

  if (duplicateCandidates.length > 0) {
    console.log('=== 공백 차이로 인한 중복 의심 제목 ===');
    duplicateCandidates.forEach(([t1, t2]) => {
      console.log(`"${t1}" (${t1.length}자) vs "${t2}" (${t2.length}자)`);
      const chars1 = Array.from(t1).map(c => c.charCodeAt(0));
      const chars2 = Array.from(t2).map(c => c.charCodeAt(0));
      console.log(`  - Char codes 1: ${chars1.join(', ')}`);
      console.log(`  - Char codes 2: ${chars2.join(', ')}`);
    });
  } else {
    console.log('공백 차이 중복 없음');
  }

  // 모든 책 제목 출력 (정렬)
  console.log('\n=== 전체 책 제목 목록 ===');
  const sortedTitles = Array.from(bookTitles.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  sortedTitles.forEach(([title, info], idx) => {
    console.log(`${idx + 1}. "${title}" (${info.count}회)`);
  });
}

checkBookDuplicates().catch(console.error);
