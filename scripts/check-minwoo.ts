import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function checkMinwoo() {
  const submissions = await db
    .collection('reading_submissions')
    .where('participationCode', '==', 'cohort3-민우')
    .get();

  console.log(`cohort3-민우 인증 내역:\n`);
  submissions.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.submissionDate}: [${data.status}]`);
  });

  // 11-10 이전 approved
  const before1110 = submissions.docs.filter(doc => {
    const data = doc.data();
    return data.status === 'approved' && data.submissionDate < '2025-11-10';
  });

  console.log(`\n11-10 매칭 기준:`);
  console.log(`  11-10 이전 approved: ${before1110.length}회`);
  console.log(`  예상 프로필북: ${2 * (before1110.length + 2)}개`);

  // 11-11 이전 approved
  const before1111 = submissions.docs.filter(doc => {
    const data = doc.data();
    return data.status === 'approved' && data.submissionDate < '2025-11-11';
  });

  console.log(`\n11-11 매칭 기준:`);
  console.log(`  11-11 이전 approved: ${before1111.length}회`);
  console.log(`  예상 프로필북: ${2 * (before1111.length + 2)}개`);

  process.exit(0);
}

checkMinwoo();
