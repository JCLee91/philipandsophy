import { getFirebaseAdmin } from './src/lib/firebase/admin-init';

async function check() {
  const { db } = getFirebaseAdmin();
  
  // 독서 인증 샘플 (최근 10개)
  const submissions = await db.collection('reading_submissions')
    .orderBy('submittedAt', 'desc')
    .limit(10)
    .get();
  
  console.log('=== 독서 인증 이미지 URL 샘플 (최근 10개) ===\n');
  submissions.docs.forEach(doc => {
    const data = doc.data();
    console.log(`[${doc.id}]`);
    console.log(`  participantId: ${data.participantId}`);
    console.log(`  bookImageUrl: ${data.bookImageUrl}`);
    console.log('');
  });
}

check().then(() => process.exit(0));
