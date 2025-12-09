const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkBooksCohort5() {
  // 5기 참가자 조회 (5, 5-1, 5-2 등 모두 포함)
  const participantsSnapshot = await db.collection('participants')
    .where('cohortId', '>=', '5')
    .where('cohortId', '<', '6')
    .get();

  console.log(`\n5기 참가자 수: ${participantsSnapshot.size}명`);

  // cohort별 참가자
  const cohortParticipants = new Map();
  const participantIds = new Set();

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    // 어드민, 슈퍼어드민, 고스트 제외
    if (data.isSuperAdmin || data.isAdministrator || data.isGhost) {
      console.log(`  제외: ${data.name} (admin/ghost)`);
      return;
    }

    const cohortId = data.cohortId;
    if (!cohortParticipants.has(cohortId)) {
      cohortParticipants.set(cohortId, []);
    }
    cohortParticipants.get(cohortId).push({ id: doc.id, name: data.name });
    participantIds.add(doc.id);
  });

  console.log(`\n실제 참가자 수 (admin 제외): ${participantIds.size}명`);
  cohortParticipants.forEach((participants, cohortId) => {
    console.log(`  ${cohortId}: ${participants.length}명`);
  });

  // 인증 조회
  const submissionsSnapshot = await db.collection('reading_submissions').get();

  // 책 집계
  const bookMap = new Map();
  let totalSubmissions = 0;
  let draftCount = 0;
  let noParticipantCount = 0;
  let noBookTitleCount = 0;

  submissionsSnapshot.docs.forEach((doc) => {
    const data = doc.data();

    // 5기 참가자의 인증만
    if (!participantIds.has(data.participantId)) return;

    totalSubmissions++;

    if (data.status === 'draft') {
      draftCount++;
      return;
    }

    const bookTitle = data.bookTitle || '';
    if (bookTitle.trim().length === 0) {
      noBookTitleCount++;
      return;
    }

    if (!bookMap.has(bookTitle)) {
      bookMap.set(bookTitle, { count: 1, participants: new Set([data.participantId]) });
    } else {
      const book = bookMap.get(bookTitle);
      book.count++;
      book.participants.add(data.participantId);
    }
  });

  console.log(`\n총 인증 수: ${totalSubmissions}개`);
  console.log(`  - draft: ${draftCount}개`);
  console.log(`  - 책 제목 없음: ${noBookTitleCount}개`);
  console.log(`\n고유 책 종류: ${bookMap.size}권`);

  // 책 목록 출력
  console.log('\n=== 전체 책 목록 ===');
  const sortedBooks = Array.from(bookMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  sortedBooks.forEach(([title, info], idx) => {
    console.log(`${idx + 1}. "${title}" (${info.count}회, ${info.participants.size}명)`);
  });

  // 유사 제목 체크 (trim 후 비교)
  console.log('\n=== 유사 제목 체크 ===');
  const titles = Array.from(bookMap.keys());
  let foundSimilar = false;

  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      const t1 = titles[i].trim().replace(/\s+/g, ' ');
      const t2 = titles[j].trim().replace(/\s+/g, ' ');

      if (t1 === t2) {
        console.log(`중복 발견: "${titles[i]}" vs "${titles[j]}"`);
        foundSimilar = true;
      }
    }
  }

  if (!foundSimilar) {
    console.log('유사 제목 없음');
  }
}

checkBooksCohort5().catch(console.error);
