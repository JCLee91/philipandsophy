const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
db.settings({ databaseId: 'seoul' });

async function checkStructure() {
  const docId = '4-2-2025-11-25';
  const doc = await db.collection('matching_results').doc(docId).get();

  if (!doc.exists) {
    console.log('Document not found');
    process.exit(1);
  }

  const data = doc.data();
  console.log('Full document structure:');
  console.log(JSON.stringify(data, null, 2));

  process.exit(0);
}

checkStructure().catch(console.error);
