const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 서울 데이터베이스에 연결
const db = getFirestore(admin.app(), 'seoul');

async function main() {
  // cohortId 패턴 확인
  const allParticipants = await db.collection('participants').get();
  const cohortIds = new Map();
  allParticipants.docs.forEach(doc => {
    const cohortId = doc.data().cohortId || 'undefined';
    cohortIds.set(cohortId, (cohortIds.get(cohortId) || 0) + 1);
  });
  console.log('전체 참가자 수:', allParticipants.size);
  console.log('cohortId별 참가자 수:');
  [...cohortIds.entries()].sort().forEach(([id, count]) => {
    console.log(`  ${id}: ${count}명`);
  });

  // reading_submissions 전체 개수
  const allSubmissions = await db.collection('reading_submissions').get();
  console.log('\n전체 reading_submissions 수:', allSubmissions.size);

  // 1. 5기 참가자 ID 목록 조회 (5로 시작하는 모든 cohortId)
  const participantsSnapshot = await db.collection('participants').get();
  const cohort5Participants = participantsSnapshot.docs.filter(doc => {
    const cohortId = doc.data().cohortId || '';
    return cohortId.startsWith('5');
  });

  const cohort5ParticipantIds = new Set();
  cohort5Participants.forEach(doc => {
    const data = doc.data();
    if (!data.isSuperAdmin && !data.isAdministrator && !data.isGhost) {
      cohort5ParticipantIds.add(doc.id);
    }
  });
  console.log('5기 참가자 수:', cohort5ParticipantIds.size);

  // 2. 제출물 전체 조회 후 5기 참가자만 필터링 (reading_submissions 컬렉션)
  const snapshot = await db.collection('reading_submissions').get();

  const cohort5Docs = snapshot.docs.filter(doc => {
    const data = doc.data();
    const participantId = data.participantId;
    // 5기 참가자이고 draft 아닌 것만
    return cohort5ParticipantIds.has(participantId) && data.status !== 'draft';
  });

  let maxReview = { length: 0, participantId: '', submissionDate: '', fullText: '' };
  let maxDailyAnswer = { length: 0, participantId: '', submissionDate: '', fullText: '' };

  cohort5Docs.forEach(doc => {
    const data = doc.data();
    const reviewLen = (data.review || '').length;
    const dailyAnswerLen = (data.dailyAnswer || '').length;

    if (reviewLen > maxReview.length) {
      maxReview = {
        length: reviewLen,
        participantId: data.participantId,
        submissionDate: data.submissionDate,
        fullText: data.review || ''
      };
    }

    if (dailyAnswerLen > maxDailyAnswer.length) {
      maxDailyAnswer = {
        length: dailyAnswerLen,
        participantId: data.participantId,
        submissionDate: data.submissionDate,
        fullText: data.dailyAnswer || ''
      };
    }
  });

  console.log('5기 제출물 총 개수:', cohort5Docs.length);
  console.log('');
  console.log('=== 감상평(review) 최장 ===');
  console.log('글자수:', maxReview.length);
  console.log('참가자 ID:', maxReview.participantId);
  console.log('제출일:', maxReview.submissionDate);
  console.log('전체 내용:\n', maxReview.fullText);
  console.log('\n');
  console.log('=== 가치관 답변(dailyAnswer) 최장 ===');
  console.log('글자수:', maxDailyAnswer.length);
  console.log('참가자 ID:', maxDailyAnswer.participantId);
  console.log('제출일:', maxDailyAnswer.submissionDate);
  console.log('전체 내용:\n', maxDailyAnswer.fullText);
}

main().catch(console.error);
