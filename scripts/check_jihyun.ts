import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';

const { db } = getFirebaseAdmin();

async function checkUser() {
  const snap = await db!.collection('participants').get();

  const missing: Array<{id: string, name: string, cohortId: string}> = [];

  snap.docs.forEach(doc => {
    const d = doc.data();
    const cohort = String(d.cohortId || '');
    if (cohort.startsWith('4') && !d.participationCode) {
      missing.push({ id: doc.id, name: d.name, cohortId: d.cohortId });
    }
  });

  console.log('cohort 4-x 중 participationCode 없는 참가자:', missing.length + '명');
  missing.forEach(m => console.log('  -', m.name, '| cohort:', m.cohortId, '| ID:', m.id));

  console.log('\n=== cohort4-2-지현 상세 ===');
  const participantsRef = db!.collection('participants');
  const snapshot = await participantsRef.get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // cohort4-2-지현만
    if (doc.id !== 'cohort4-2-지현') continue;
    
    console.log('\n--- Participant ---');
    console.log('ID:', doc.id);
    console.log('Name:', data.name);
    console.log('cohortId:', data.cohortId);
    console.log('participationCode:', data.participationCode);
    console.log('phone:', data.phone);
    
    // 해당 유저의 submissions 확인
    const submissionsSnap = await db!.collection('reading_submissions')
      .where('participantId', '==', doc.id)
      .orderBy('submittedAt', 'desc')
      .limit(5)
      .get();
    
    console.log('\n최근 제출물 (' + submissionsSnap.size + '개):');
    submissionsSnap.docs.forEach((subDoc, i) => {
      const sub = subDoc.data();
      console.log('  [' + i + '] ID:', subDoc.id);
      console.log('      bookTitle:', sub.bookTitle);
      console.log('      bookImageUrl:', sub.bookImageUrl ? sub.bookImageUrl.substring(0, 80) + '...' : '없음');
      console.log('      submissionDate:', sub.submissionDate);
      console.log('      status:', sub.status);
      console.log('      isEBook:', sub.isEBook);
    });
    
    // draft 확인
    const draftsSnap = await db!.collection('draft_submissions')
      .where('participantId', '==', doc.id)
      .get();
    
    console.log('\n임시저장 (' + draftsSnap.size + '개):');
    draftsSnap.docs.forEach((draftDoc, i) => {
      const draft = draftDoc.data();
      console.log('  [' + i + '] ID:', draftDoc.id);
      console.log('      bookImageUrl:', draft.bookImageUrl ? '있음' : '없음');
      console.log('      editingSubmissionId:', draft.editingSubmissionId || '없음');
      console.log('      isEBook:', draft.isEBook);
    });
  }
}

checkUser().catch(console.error);
