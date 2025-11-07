import { getFirebaseAdmin } from './src/lib/firebase/admin-init';

async function check() {
  const { db } = getFirebaseAdmin();
  
  // 1기 샘플
  const cohort1Sample = await db.collection('participants')
    .where('cohortId', '==', '1')
    .limit(3)
    .get();
  
  console.log('=== 1기 프로필 이미지 URL 샘플 ===');
  cohort1Sample.docs.forEach(doc => {
    const data = doc.data();
    console.log(`[${doc.id}]`);
    console.log(`  profileImage: ${data.profileImage}`);
    console.log(`  profileImageCircle: ${data.profileImageCircle}`);
  });
  
  // 2기 샘플
  const cohort2Sample = await db.collection('participants')
    .where('cohortId', '==', '2')
    .limit(3)
    .get();
  
  console.log('\n=== 2기 프로필 이미지 URL 샘플 ===');
  cohort2Sample.docs.forEach(doc => {
    const data = doc.data();
    console.log(`[${doc.id}]`);
    console.log(`  profileImage: ${data.profileImage}`);
    console.log(`  profileImageCircle: ${data.profileImageCircle}`);
  });
}

check().then(() => process.exit(0));
