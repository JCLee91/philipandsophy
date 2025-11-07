import { getFirebaseAdmin } from './src/lib/firebase/admin-init';

async function check() {
  const { db } = getFirebaseAdmin();
  const snap = await db.collection('notices')
    .where('imageUrl', '!=', null)
    .orderBy('imageUrl')
    .limit(5)
    .get();
  
  console.log('공지사항 이미지 URL 샘플:');
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`\n[${doc.id}]`);
    console.log(`  cohortId: ${data.cohortId}`);
    console.log(`  imageUrl: ${data.imageUrl}`);
  });
}

check().then(() => process.exit(0));
