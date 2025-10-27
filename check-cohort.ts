import { getFirebaseAdmin } from './src/lib/firebase/admin-init';

async function checkCohorts() {
  const { db } = getFirebaseAdmin();
  
  console.log('=== Checking Cohorts ===\n');
  
  const cohortsSnapshot = await db.collection('cohorts').get();
  console.log(`Found ${cohortsSnapshot.size} cohorts:\n`);
  
  cohortsSnapshot.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log(`Data:`, JSON.stringify(doc.data(), null, 2));
    console.log('---\n');
  });
  
  console.log('\n=== Checking Participants in cohortId="2" ===\n');
  const participantsSnapshot = await db.collection('participants')
    .where('cohortId', '==', '2')
    .get();
  
  console.log(`Found ${participantsSnapshot.size} participants with cohortId="2"\n`);
  
  process.exit(0);
}

checkCohorts().catch(console.error);
