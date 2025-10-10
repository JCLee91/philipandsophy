/**
 * Check User Data Script
 * Verifies user-junyoung's data in Firebase
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Service Account 키 경로
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

// 키 파일 확인
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service Account 키 파일을 찾을 수 없습니다.');
  process.exit(1);
}

// Admin SDK 초기화
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkUserData() {
  console.log('🔍 Checking user-junyoung data...\n');

  // 1. Participant 정보 확인
  console.log('📊 1. Checking participant data:\n');
  const participantDoc = await db.collection('participants').doc('user-junyoung').get();

  if (participantDoc.exists) {
    const data = participantDoc.data();
    console.log('✅ Participant found:');
    console.log(`   - ID: user-junyoung`);
    console.log(`   - Name: ${data?.name}`);
    console.log(`   - Phone: ${data?.phoneNumber}`);
    console.log(`   - Cohort: ${data?.cohortId}`);
    console.log(`   - Is Admin: ${data?.isAdmin}`);
    console.log(`   - Current Book: ${data?.currentBookTitle || 'None'}`);
    console.log('');
  } else {
    console.log('❌ Participant not found!\n');
    return;
  }

  // 2. 모든 reading_submissions 확인 (participantId로 검색)
  console.log('📊 2. Checking reading submissions by participantId:\n');
  const submissionsByParticipantId = await db
    .collection('reading_submissions')
    .where('participantId', '==', 'user-junyoung')
    .get();

  console.log(`   Found ${submissionsByParticipantId.size} submission(s) by participantId\n`);

  submissionsByParticipantId.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`   ${index + 1}. ${doc.id}:`);
    console.log(`      - Book: ${data.bookTitle}`);
    console.log(`      - Participant ID: ${data.participantId}`);
    console.log(`      - Participation Code: ${data.participationCode}`);
    console.log(`      - Submitted At: ${data.submittedAt?.toDate?.()}`);
    console.log('');
  });

  // 3. participationCode로도 검색
  console.log('📊 3. Checking reading submissions by participationCode:\n');
  const submissionsByCode = await db
    .collection('reading_submissions')
    .where('participationCode', '==', '42633467921')
    .get();

  console.log(`   Found ${submissionsByCode.size} submission(s) by participationCode\n`);

  submissionsByCode.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`   ${index + 1}. ${doc.id}:`);
    console.log(`      - Book: ${data.bookTitle}`);
    console.log(`      - Participant ID: ${data.participantId}`);
    console.log(`      - Participation Code: ${data.participationCode}`);
    console.log(`      - Submitted At: ${data.submittedAt?.toDate?.()}`);
    console.log('');
  });

  // 4. 전체 submissions에서 user-junyoung 관련 데이터 찾기
  console.log('📊 4. Scanning all submissions for user-junyoung:\n');
  const allSubmissions = await db.collection('reading_submissions').get();

  const relatedSubmissions = allSubmissions.docs.filter(doc => {
    const data = doc.data();
    return data.participantId === 'user-junyoung' ||
           data.participationCode === '42633467921';
  });

  console.log(`   Total submissions in DB: ${allSubmissions.size}`);
  console.log(`   Related to user-junyoung: ${relatedSubmissions.length}\n`);

  if (relatedSubmissions.length > 0) {
    console.log('   Related submissions:');
    relatedSubmissions.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${doc.id}:`);
      console.log(`      - Book: ${data.bookTitle}`);
      console.log(`      - Participant ID: ${data.participantId}`);
      console.log(`      - Participation Code: ${data.participationCode}`);
      console.log('');
    });
  }
}

async function main() {
  try {
    await checkUserData();
    console.log('✅ Check completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
