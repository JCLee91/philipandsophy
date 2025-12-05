import { getAdminDb } from '../src/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = getAdminDb();

// 잘못된 질문을 받은 5개 문서 ID
const WRONG_QUESTION_DOCS = [
  '구태경_1206_0048',
  '박성현_1206_0022',
  '백은우_1206_0000',
  '정양원_1206_0001',
  '정연우_1205_1829',
];

// 4기 Day 14 올바른 질문
const CORRECT_QUESTION = '다른 동물로 다시 태어날 수 있다면, 어떤 동물이 되고 싶나요? (이유도 적어주세요.)';

async function fixWrongQuestionDocs() {
  console.log('=== 잘못된 질문 문서 수정 시작 ===\n');

  for (const docId of WRONG_QUESTION_DOCS) {
    const docRef = db.collection('reading_submissions').doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`❌ ${docId}: 문서 없음`);
      continue;
    }

    const data = doc.data()!;
    console.log(`\n📄 ${docId}:`);
    console.log(`   status: ${data.status}`);
    console.log(`   submittedAt: ${data.submittedAt?.toDate?.()}`);
    console.log(`   dailyQuestion: ${data.dailyQuestion?.substring(0, 30)}...`);

    // 수정 필요한 필드 확인
    const updates: Record<string, any> = {};

    // 1. dailyQuestion 수정
    if (data.dailyQuestion?.includes('차 한 대')) {
      updates.dailyQuestion = CORRECT_QUESTION;
      console.log(`   ✏️ dailyQuestion 수정 예정`);
    }

    // 2. status가 approved가 아니면 수정
    if (data.status !== 'approved') {
      updates.status = 'approved';
      console.log(`   ✏️ status → approved 예정`);
    }

    // 3. submittedAt이 없으면 createdAt으로 설정
    if (!data.submittedAt && data.createdAt) {
      updates.submittedAt = data.createdAt;
      console.log(`   ✏️ submittedAt 추가 예정 (createdAt 복사)`);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = FieldValue.serverTimestamp();
      await docRef.update(updates);
      console.log(`   ✅ 수정 완료: ${Object.keys(updates).join(', ')}`);
    } else {
      console.log(`   ⏭️ 수정 필요 없음`);
    }
  }

  console.log('\n=== 수정 완료 ===');
}

async function investigate() {
  // 잘못된 질문이 저장된 문서들
  const wrongQuestion = '차 한 대, 소파 하나, 신발 한 켤레에 쓸 수 있는 최대 금액은?';
  const correctQuestion = '다른 동물로 다시 태어날 수 있다면, 어떤 동물이 되고 싶나요? (이유도 적어주세요.)';

  console.log('=== 12/5 제출물 중 잘못된 질문이 저장된 문서들 ===');
  const submissionsSnap = await db.collection('reading_submissions')
    .where('submissionDate', '==', '2025-12-05')
    .get();

  const wrongDocs: any[] = [];
  const correctDocs: any[] = [];

  submissionsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.dailyQuestion?.includes('차 한 대')) {
      wrongDocs.push({
        id: doc.id,
        cohortId: data.cohortId,
        participantId: data.participantId,
        dailyQuestion: data.dailyQuestion,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
      });
    } else if (data.dailyQuestion?.includes('다른 동물')) {
      correctDocs.push({
        id: doc.id,
        cohortId: data.cohortId,
        participantId: data.participantId,
      });
    }
  });

  console.log('\n잘못된 질문 저장된 문서 (' + wrongDocs.length + '개):');
  wrongDocs.forEach(d => console.log(d));

  console.log('\n올바른 질문 저장된 문서 (' + correctDocs.length + '개):');
  correctDocs.forEach(d => console.log({ id: d.id, cohortId: d.cohortId }));

  // 시간 순서대로 정렬해서 패턴 확인
  console.log('\n=== 시간순 정렬 (잘못된 질문) ===');
  wrongDocs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  wrongDocs.forEach(d => console.log(`${d.createdAt} - ${d.id} (${d.cohortId})`));

  // 1기와 4기의 Day 14 질문 비교
  console.log('\n=== 1기 vs 4기 Day 14 질문 ===');
  const q1 = await db.doc('cohorts/1/daily_questions/14').get();
  const q41 = await db.doc('cohorts/4-1/daily_questions/14').get();
  const q42 = await db.doc('cohorts/4-2/daily_questions/14').get();

  console.log('1기 Day 14:', q1.data()?.question);
  console.log('4-1기 Day 14:', q41.data()?.question);
  console.log('4-2기 Day 14:', q42.data()?.question);

  // 혹시 draft에 잘못된 질문이 저장되어 있는지 확인
  console.log('\n=== Draft 문서 중 잘못된 질문이 있는지 ===');
  const draftsSnap = await db.collection('reading_submissions')
    .where('status', '==', 'draft')
    .get();

  const wrongDrafts: any[] = [];
  draftsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.dailyQuestion?.includes('차 한 대')) {
      wrongDrafts.push({
        id: doc.id,
        cohortId: data.cohortId,
        participantId: data.participantId,
        dailyQuestion: data.dailyQuestion,
      });
    }
  });

  console.log('잘못된 질문이 있는 draft:', wrongDrafts.length + '개');
  wrongDrafts.forEach(d => console.log(d));

  // 🆕 잘못된 질문 받은 유저들의 participant 정보 확인
  console.log('\n=== 잘못된 질문 받은 유저들의 참가 이력 ===');
  const wrongParticipantIds = wrongDocs.map(d => d.participantId);

  for (const pid of wrongParticipantIds) {
    // 해당 participant의 모든 참가 기록 확인
    const participantsSnap = await db.collection('participants')
      .where('id', '==', pid)
      .get();

    if (participantsSnap.empty) {
      // id 필드가 아닌 문서 ID로 조회
      const doc = await db.doc(`participants/${pid}`).get();
      if (doc.exists) {
        const data = doc.data();
        console.log(`\n[${pid}]`);
        console.log(`  cohortId: ${data?.cohortId}`);
        console.log(`  name: ${data?.name}`);
      }
    } else {
      participantsSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`\n[${pid}]`);
        console.log(`  docId: ${doc.id}`);
        console.log(`  cohortId: ${data.cohortId}`);
        console.log(`  name: ${data.name}`);
      });
    }
  }

  // 🆕 복수 기수 참가자 확인 - 이름으로 조회
  console.log('\n=== 복수 기수 참가 여부 확인 ===');
  const names = ['태경', '성현', '은우', '양원', '연우']; // 잘못된 질문 받은 유저 이름들

  for (const name of names) {
    const allParticipantsSnap = await db.collection('participants')
      .where('name', '==', name)
      .get();

    if (allParticipantsSnap.size > 1) {
      console.log(`\n${name}: ${allParticipantsSnap.size}개 기수 참가`);
      allParticipantsSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id} (cohortId: ${data.cohortId})`);
      });
    }
  }

  // 🆕 최근 제출물들의 cohortId vs participantId 패턴 분석
  console.log('\n=== 최근 30개 제출물 cohortId 패턴 ===');
  const recentSnap = await db.collection('reading_submissions')
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get();

  const cohortPattern: Record<string, number> = {};
  recentSnap.docs.forEach(doc => {
    const data = doc.data();
    const key = data.cohortId || 'NO_COHORT';
    cohortPattern[key] = (cohortPattern[key] || 0) + 1;
  });
  console.log(cohortPattern);

  // 🆕 각 cohort의 programStartDate 확인
  console.log('\n=== 각 cohort의 programStartDate ===');
  const cohortIds = ['1', '4-1', '4-2'];
  for (const cid of cohortIds) {
    const cohortDoc = await db.doc(`cohorts/${cid}`).get();
    const data = cohortDoc.data();
    console.log(`${cid}: programStartDate=${data?.programStartDate}, startDate=${data?.startDate}`);
  }

  // 🆕 Day 계산 검증 - 2025-12-05 기준으로 각 cohort에서 몇 Day인지
  console.log('\n=== 2025-12-05 기준 Day 계산 ===');
  const testDate = '2025-12-05';
  for (const cid of cohortIds) {
    const cohortDoc = await db.doc(`cohorts/${cid}`).get();
    const data = cohortDoc.data();
    const programStart = data?.programStartDate || data?.startDate;
    if (programStart) {
      const startParsed = new Date(programStart);
      const testParsed = new Date(testDate);
      const diffDays = Math.floor((testParsed.getTime() - startParsed.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`${cid}: Day ${diffDays} (programStart: ${programStart})`);
    }
  }

  // 🆕 cohortId: '0'인 제출물들 상세 확인
  console.log('\n=== cohortId: 0인 제출물들 ===');
  const zeroSnap = await db.collection('reading_submissions')
    .where('cohortId', '==', '0')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  zeroSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log({
      id: doc.id,
      participantId: data.participantId,
      cohortId: data.cohortId,
      submissionDate: data.submissionDate,
      dailyQuestion: data.dailyQuestion?.substring(0, 30),
    });
  });
}

// 실행: 수정 함수
fixWrongQuestionDocs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

// 조사만 하려면 아래 주석 해제
// investigate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
