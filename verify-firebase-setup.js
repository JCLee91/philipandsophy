const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

console.log('=== Firebase Service Account Info ===');
console.log('Project ID:', serviceAccount.project_id);
console.log('Client Email:', serviceAccount.client_email);
console.log('Private Key ID:', serviceAccount.private_key_id?.substring(0, 20) + '...');
console.log('');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

(async () => {
  try {
    const db = admin.firestore();

    console.log('=== Super Admin Documents ===');
    const superAdmins = await db.collection('participants')
      .where('isSuperAdmin', '==', true)
      .get();

    console.log(`Found ${superAdmins.size} super admin document(s):`);
    superAdmins.forEach(doc => {
      const data = doc.data();
      console.log('');
      console.log(`Document ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Phone: ${data.phone}`);
      console.log(`  Firebase UID: ${data.firebaseUid || 'NOT SET'}`);
      console.log(`  isAdministrator: ${data.isAdministrator}`);
      console.log(`  isSuperAdmin: ${data.isSuperAdmin}`);
      console.log(`  Cohort ID: ${data.cohortId}`);
    });

    console.log('');
    console.log('=== All Administrator Documents ===');
    const allAdmins = await db.collection('participants')
      .where('isAdministrator', '==', true)
      .get();

    console.log(`Found ${allAdmins.size} administrator document(s):`);
    allAdmins.forEach(doc => {
      const data = doc.data();
      console.log('');
      console.log(`Document ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Phone: ${data.phone}`);
      console.log(`  Firebase UID: ${data.firebaseUid || 'NOT SET'}`);
      console.log(`  isAdministrator: ${data.isAdministrator}`);
      console.log(`  isSuperAdmin: ${data.isSuperAdmin || false}`);
    });

    console.log('');
    console.log('=== Verification Complete ===');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
