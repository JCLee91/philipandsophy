const admin = require('firebase-admin');
const { format } = require('date-fns');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// API 로직 그대로 재현
async function checkAPILogic() {
  const cohortId = '5';

  // 1. 참가자 정보 조회
  let participantsQuery = db.collection('participants');
  if (cohortId) {
    participantsQuery = participantsQuery.where('cohortId', '==', cohortId);
  }
  const participantsSnapshot = await participantsQuery.get();

  const adminIds = new Set();
  const targetParticipantIds = [];

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.isSuperAdmin || data.isAdministrator || data.isGhost) {
      adminIds.add(doc.id);
    } else {
      targetParticipantIds.push(doc.id);
    }
  });

  console.log(`참가자 수: ${targetParticipantIds.length}명`);

  // 2. 독서 인증 조회
  const nonAdminSubmissions = [];
  if (targetParticipantIds.length > 0) {
    const chunkSize = 10;
    for (let i = 0; i < targetParticipantIds.length; i += chunkSize) {
      const chunk = targetParticipantIds.slice(i, i + chunkSize);
      const chunkSnapshot = await db
        .collection('reading_submissions')
        .where('participantId', 'in', chunk)
        .get();
      nonAdminSubmissions.push(...chunkSnapshot.docs);
    }
  }

  console.log(`전체 인증 수: ${nonAdminSubmissions.length}개`);

  // draft 제외
  const validSubmissions = nonAdminSubmissions.filter((doc) => {
    const data = doc.data();
    return data.status !== 'draft';
  });

  console.log(`유효 인증 수 (draft 제외): ${validSubmissions.length}개`);

  // 중복 제거 (participantId + submissionDate)
  const uniqueSubmissionKeys = new Set();
  const deduplicatedSubmissions = [];

  validSubmissions.forEach((doc) => {
    const data = doc.data();
    let submissionDate = data.submissionDate;
    if (!submissionDate && data.submittedAt) {
      const submittedAt = data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
      submissionDate = format(submittedAt, 'yyyy-MM-dd');
    }
    if (submissionDate) {
      const uniqueKey = `${data.participantId}_${submissionDate}`;
      if (!uniqueSubmissionKeys.has(uniqueKey)) {
        uniqueSubmissionKeys.add(uniqueKey);
        deduplicatedSubmissions.push(doc);
      }
    }
  });

  console.log(`중복 제거 후 인증 수: ${deduplicatedSubmissions.length}개`);

  // 참가자 이름 매핑
  const participantNames = new Map();
  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    participantNames.set(doc.id, data.name || '알 수 없음');
  });

  // 책 목록 집계 (API 로직 그대로)
  const bookMap = new Map();

  deduplicatedSubmissions.forEach((doc) => {
    const data = doc.data();
    const bookTitle = data.bookTitle || '';
    const bookAuthor = data.bookAuthor;
    const participantId = data.participantId;

    if (bookTitle.trim().length > 0 && participantId) {
      if (!bookMap.has(bookTitle)) {
        bookMap.set(bookTitle, {
          title: bookTitle,
          author: bookAuthor,
          count: 0,
          participantIds: new Set(),
        });
      }
      const bookData = bookMap.get(bookTitle);
      bookData.count++;
      bookData.participantIds.add(participantId);
    }
  });

  // allBooks 생성 (API와 동일)
  const allBooks = Array.from(bookMap.values())
    .map((book) => ({
      title: book.title,
      author: book.author,
      count: book.count,
      participants: Array.from(book.participantIds)
        .map((id) => participantNames.get(id) || '알 수 없음')
        .sort(),
    }))
    .sort((a, b) => b.count - a.count);

  console.log(`\nAPI 결과 allBooks.length: ${allBooks.length}권`);
  console.log('\n=== allBooks 목록 ===');
  allBooks.forEach((book, idx) => {
    console.log(`${idx + 1}. "${book.title}" (${book.count}회)`);
  });
}

checkAPILogic().catch(console.error);
