const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

(async () => {
  try {
    const db = admin.firestore();

    console.log('=== All Participants Documents ===');
    const snapshot = await db.collection('participants').get();

    console.log(`Total documents: ${snapshot.size}`);
    console.log('');

    if (snapshot.empty) {
      console.log('❌ No participants found!');
      process.exit(1);
    }

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[${index + 1}] Document ID: ${doc.id}`);
      console.log(`    Name: ${data.name}`);
      console.log(`    Phone: ${data.phone}`);
      console.log(`    Firebase UID: ${data.firebaseUid || '❌ NOT SET'}`);
      console.log(`    isAdministrator: ${data.isAdministrator || false}`);
      console.log(`    isSuperAdmin: ${data.isSuperAdmin || false}`);
      console.log(`    Cohort: ${data.cohortId}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
