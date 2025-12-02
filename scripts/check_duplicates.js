
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkSubmissions() {
  console.log('Checking submissions for cohort 4-2 on 2025-11-24...');
  
  const snapshot = await db.collection('reading_submissions')
    .where('cohortId', '==', '4-2')
    .where('submissionDate', '==', '2025-11-24')
    .where('status', '==', 'approved')
    .get();

  console.log(`Total documents found: ${snapshot.size}`);

  const participantCounts = {};
  const submissions = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const pid = data.participantId;
    
    participantCounts[pid] = (participantCounts[pid] || 0) + 1;
    
    submissions.push({
      id: doc.id,
      participantId: pid,
      participantName: data.participantName || 'Unknown', // 이름이 없을 수도 있으니
      createdAt: data.createdAt ? data.createdAt.toDate() : 'No Date',
      bookTitle: data.bookTitle
    });
  });

  // 중복 제출자 확인
  const duplicates = Object.entries(participantCounts)
    .filter(([pid, count]) => count > 1);

  if (duplicates.length > 0) {
    console.log('\n⚠️ Duplicate Submissions Found:');
    duplicates.forEach(([pid, count]) => {
      console.log(`- Participant ID: ${pid} (Count: ${count})`);
      const userSubs = submissions.filter(s => s.participantId === pid);
      console.table(userSubs);
    });
  } else {
    console.log('\n✅ No duplicate submissions found based on participantId.');
  }

  console.log(`\nUnique Participants: ${Object.keys(participantCounts).length}`);
}

checkSubmissions().catch(console.error);

















