const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// 두 개의 앱 인스턴스 생성
const restoredApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://philipandsophy.firebaseio.com`,
}, 'restored');

const defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://philipandsophy.firebaseio.com`,
}, 'default');

const restoredDb = restoredApp.firestore();
restoredDb.settings({ databaseId: 'restored-20min-ago' });

const defaultDb = defaultApp.firestore();

async function copyCollection(collectionName) {
  console.log(`\n📁 Copying ${collectionName}...`);

  const snapshot = await restoredDb.collection(collectionName).get();
  console.log(`   Found ${snapshot.size} documents`);

  if (snapshot.empty) {
    console.log(`   ⏭️  Skipping (empty)`);
    return;
  }

  let copied = 0;
  const batch = defaultDb.batch();

  for (const doc of snapshot.docs) {
    const docRef = defaultDb.collection(collectionName).doc(doc.id);
    batch.set(docRef, doc.data());
    copied++;

    // Firestore batch limit is 500
    if (copied % 500 === 0) {
      await batch.commit();
      console.log(`   ✅ Committed ${copied} documents`);
    }
  }

  if (copied % 500 !== 0) {
    await batch.commit();
  }

  console.log(`   ✅ Copied ${copied} documents`);
}

(async () => {
  try {
    console.log('=== Copying from restored-20min-ago to (default) ===');
    console.log('⚠️  WARNING: This will overwrite existing data in (default) database!');
    console.log('');

    // 복사할 컬렉션 목록
    const collections = [
      'participants',
      'cohorts',
      'reading_submissions',
      'notices',
      'messages',
      'matching_previews',
    ];

    for (const collection of collections) {
      await copyCollection(collection);
    }

    console.log('\n=== Copy Complete ===');
    console.log('✅ All data has been copied to (default) database!');
    console.log('');
    console.log('Next step: Verify in Firebase Console that data appears in (default) database');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
