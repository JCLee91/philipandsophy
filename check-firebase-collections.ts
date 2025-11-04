import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://philipandsophy.firebaseio.com'
});

const db = admin.firestore();

async function checkCollections() {
  try {
    console.log('=== Firebase 컬렉션 확인 ===\n');

    // 모든 컬렉션 리스트
    const collections = await db.listCollections();
    console.log('사용 가능한 컬렉션:');
    collections.forEach(collection => {
      console.log(`  - ${collection.id}`);
    });

    console.log('\n각 컬렉션의 문서 수:');

    for (const collection of collections) {
      const snapshot = await db.collection(collection.id).limit(1).get();
      const count = snapshot.size > 0 ? '1개 이상' : '0개';
      console.log(`  ${collection.id}: ${count}`);

      if (snapshot.size > 0) {
        const firstDoc = snapshot.docs[0];
        console.log(`    첫 번째 문서 ID: ${firstDoc.id}`);
        console.log(`    필드: ${Object.keys(firstDoc.data()).join(', ')}`);
      }
    }

  } catch (error) {
    console.error('오류:', error);
  } finally {
    process.exit(0);
  }
}

checkCollections();
