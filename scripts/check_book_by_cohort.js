const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkBooksByCohort() {
  // 참가자 조회
  const participantsSnapshot = await db.collection('participants').get();

  // cohort별 참가자 매핑 (admin 제외)
  const cohortParticipants = new Map(); // cohortId -> Set<participantId>
  const participantCohorts = new Map(); // participantId -> cohortId

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    // 어드민, 슈퍼어드민, 고스트 제외
    if (data.isSuperAdmin || data.isAdministrator || data.isGhost) return;

    const cohortId = data.cohortId;
    if (cohortId) {
      if (!cohortParticipants.has(cohortId)) {
        cohortParticipants.set(cohortId, new Set());
      }
      cohortParticipants.get(cohortId).add(doc.id);
      participantCohorts.set(doc.id, cohortId);
    }
  });

  // 인증 조회
  const submissionsSnapshot = await db.collection('reading_submissions').get();

  // cohort별 책 집계
  const cohortBooks = new Map(); // cohortId -> Map<bookTitle, count>

  submissionsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.status === 'draft') return;

    const participantId = data.participantId;
    const cohortId = participantCohorts.get(participantId);

    if (!cohortId) return;

    const bookTitle = data.bookTitle || '';
    if (bookTitle.trim().length === 0) return;

    if (!cohortBooks.has(cohortId)) {
      cohortBooks.set(cohortId, new Map());
    }

    const books = cohortBooks.get(cohortId);
    if (!books.has(bookTitle)) {
      books.set(bookTitle, 1);
    } else {
      books.set(bookTitle, books.get(bookTitle) + 1);
    }
  });

  // 결과 출력
  console.log('\n=== Cohort별 책 종류 수 ===\n');

  const sortedCohorts = Array.from(cohortBooks.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  sortedCohorts.forEach(([cohortId, books]) => {
    console.log(`[${cohortId}] ${books.size}권`);

    // 32권 근처인 cohort 상세 출력
    if (books.size >= 30 && books.size <= 35) {
      console.log('  --- 상세 목록 ---');
      const sortedBooks = Array.from(books.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));
      sortedBooks.forEach(([title, count], idx) => {
        console.log(`  ${idx + 1}. "${title}" (${count}회)`);
      });
      console.log('');
    }
  });
}

checkBooksByCohort().catch(console.error);
