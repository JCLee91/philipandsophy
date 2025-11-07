import { getFirebaseAdmin } from './src/lib/firebase/admin-init';

async function check() {
  const { db } = getFirebaseAdmin();
  
  // 참가자 프로필 이미지 URL
  const participantSnap = await db.collection('participants').limit(2).get();
  console.log('=== 참가자 프로필 이미지 URL ===');
  participantSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`\n[${doc.id}]`);
    console.log(`profileImage: ${data.profileImage}`);
    console.log(`profileImageCircle: ${data.profileImageCircle}`);
  });

  // 독서 인증 이미지 URL
  const submissionSnap = await db.collection('reading_submissions')
    .where('bookImageUrl', '!=', null)
    .limit(2)
    .get();
  console.log('\n\n=== 독서 인증 이미지 URL ===');
  submissionSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`\n[${doc.id}]`);
    console.log(`bookImageUrl: ${data.bookImageUrl}`);
  });
}

check().then(() => process.exit(0));
