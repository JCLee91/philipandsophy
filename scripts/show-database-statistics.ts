#!/usr/bin/env tsx
/**
 * Firebase Database Statistics
 *
 * Shows comprehensive statistics for all collections in the projectpns database.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Firebase Admin 초기화
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      readFileSync(join(process.cwd(), 'firebase-service-account.json'), 'utf-8')
    );

    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return getFirestore();
}

// 날짜 포맷 함수
function formatDate(timestamp: any): string {
  if (!timestamp) return 'N/A';

  let date: Date;

  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else {
    return 'N/A';
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 통계 수집 함수
async function collectStatistics() {
  const db = initializeFirebaseAdmin();

  console.log('\n📊 ProjectPNS Database Statistics\n');
  console.log('='.repeat(80));

  // 1. Cohorts 통계
  console.log('\n🎓 Cohorts (기수)');
  console.log('-'.repeat(80));
  const cohortsSnap = await db.collection('cohorts').get();
  console.log(`총 기수: ${cohortsSnap.size}개`);

  const cohortsList: any[] = [];
  cohortsSnap.forEach(doc => {
    const data = doc.data();
    cohortsList.push({
      id: doc.id,
      name: data.name,
      status: data.status,
      startDate: formatDate(data.startDate),
      endDate: formatDate(data.endDate),
      accessCode: data.accessCode
    });
  });

  cohortsList.forEach(cohort => {
    console.log(`\n  • ${cohort.name} (${cohort.id})`);
    console.log(`    - 상태: ${cohort.status}`);
    console.log(`    - 시작일: ${cohort.startDate}`);
    console.log(`    - 종료일: ${cohort.endDate}`);
    console.log(`    - 접근 코드: ${cohort.accessCode}`);
  });

  // 2. Participants 통계
  console.log('\n\n👥 Participants (참가자)');
  console.log('-'.repeat(80));
  const participantsSnap = await db.collection('participants').get();
  console.log(`총 참가자: ${participantsSnap.size}명`);

  // 역할별 통계
  const roleStats = new Map<string, number>();
  const cohortStats = new Map<string, number>();
  let adminCount = 0;

  participantsSnap.forEach(doc => {
    const data = doc.data();
    const role = data.role || 'unknown';
    const cohortId = data.cohortId || 'unknown';

    roleStats.set(role, (roleStats.get(role) || 0) + 1);
    cohortStats.set(cohortId, (cohortStats.get(cohortId) || 0) + 1);

    if (data.isAdministrator === true) {
      adminCount++;
    }
  });

  console.log('\n  역할별 분포:');
  roleStats.forEach((count, role) => {
    console.log(`    - ${role}: ${count}명`);
  });

  console.log(`\n  관리자: ${adminCount}명`);

  console.log('\n  기수별 분포:');
  cohortStats.forEach((count, cohortId) => {
    console.log(`    - ${cohortId}: ${count}명`);
  });

  // 3. Reading Submissions 통계
  console.log('\n\n📚 Reading Submissions (독서 인증)');
  console.log('-'.repeat(80));
  const submissionsSnap = await db.collection('reading_submissions').get();
  console.log(`총 독서 인증: ${submissionsSnap.size}개`);

  // 참가자별 제출 통계
  const submissionsByParticipant = new Map<string, number>();
  const submissionsByCohort = new Map<string, number>();
  const submissionsByDate = new Map<string, number>();

  submissionsSnap.forEach(doc => {
    const data = doc.data();
    const participantId = data.participantId || 'unknown';
    const cohortId = data.cohortId || 'unknown';

    submissionsByParticipant.set(participantId, (submissionsByParticipant.get(participantId) || 0) + 1);
    submissionsByCohort.set(cohortId, (submissionsByCohort.get(cohortId) || 0) + 1);

    if (data.createdAt) {
      const date = (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt)
        .toLocaleDateString('ko-KR');
      submissionsByDate.set(date, (submissionsByDate.get(date) || 0) + 1);
    }
  });

  console.log('\n  기수별 독서 인증:');
  submissionsByCohort.forEach((count, cohortId) => {
    console.log(`    - ${cohortId}: ${count}개`);
  });

  // 상위 5명 활동 참가자
  const topParticipants = Array.from(submissionsByParticipant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\n  최다 제출자 TOP 5:');
  topParticipants.forEach(([participantId, count], index) => {
    console.log(`    ${index + 1}. ${participantId}: ${count}개`);
  });

  // 최근 7일 제출 통계
  const recentDates = Array.from(submissionsByDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

  console.log('\n  최근 7일 제출:');
  recentDates.forEach(([date, count]) => {
    console.log(`    - ${date}: ${count}개`);
  });

  // 4. Notices 통계
  console.log('\n\n📢 Notices (공지사항)');
  console.log('-'.repeat(80));
  const noticesSnap = await db.collection('notices').get();
  console.log(`총 공지사항: ${noticesSnap.size}개`);

  const noticesByCohort = new Map<string, number>();
  const noticesByAuthor = new Map<string, number>();

  noticesSnap.forEach(doc => {
    const data = doc.data();
    const cohortId = data.cohortId || 'unknown';
    const author = data.authorName || 'unknown';

    noticesByCohort.set(cohortId, (noticesByCohort.get(cohortId) || 0) + 1);
    noticesByAuthor.set(author, (noticesByAuthor.get(author) || 0) + 1);
  });

  console.log('\n  기수별 공지사항:');
  noticesByCohort.forEach((count, cohortId) => {
    console.log(`    - ${cohortId}: ${count}개`);
  });

  console.log('\n  작성자별 공지사항:');
  noticesByAuthor.forEach((count, author) => {
    console.log(`    - ${author}: ${count}개`);
  });

  // 5. Messages 통계
  console.log('\n\n💬 Messages (메시지)');
  console.log('-'.repeat(80));
  const messagesSnap = await db.collection('messages').get();
  console.log(`총 메시지: ${messagesSnap.size}개`);

  const messagesBySender = new Map<string, number>();
  const messagesByReceiver = new Map<string, number>();
  const messagesPerDay = new Map<string, number>();

  messagesSnap.forEach(doc => {
    const data = doc.data();
    const sender = data.senderName || 'unknown';
    const receiver = data.receiverName || 'unknown';

    messagesBySender.set(sender, (messagesBySender.get(sender) || 0) + 1);
    messagesByReceiver.set(receiver, (messagesByReceiver.get(receiver) || 0) + 1);

    if (data.createdAt) {
      const date = (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt)
        .toLocaleDateString('ko-KR');
      messagesPerDay.set(date, (messagesPerDay.get(date) || 0) + 1);
    }
  });

  console.log('\n  발신자별 메시지:');
  Array.from(messagesBySender.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([sender, count]) => {
      console.log(`    - ${sender}: ${count}개`);
    });

  console.log('\n  수신자별 메시지:');
  Array.from(messagesByReceiver.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([receiver, count]) => {
      console.log(`    - ${receiver}: ${count}개`);
    });

  // 최근 메시지 활동
  const recentMessages = Array.from(messagesPerDay.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

  console.log('\n  최근 7일 메시지:');
  recentMessages.forEach(([date, count]) => {
    console.log(`    - ${date}: ${count}개`);
  });

  // 6. Daily Questions 통계
  console.log('\n\n❓ Daily Questions (일일 질문)');
  console.log('-'.repeat(80));
  const questionsSnap = await db.collection('daily_questions').get();
  console.log(`총 일일 질문: ${questionsSnap.size}개`);

  const questionsByCohort = new Map<string, number>();
  questionsSnap.forEach(doc => {
    const data = doc.data();
    const cohortId = data.cohortId || 'unknown';
    questionsByCohort.set(cohortId, (questionsByCohort.get(cohortId) || 0) + 1);
  });

  console.log('\n  기수별 일일 질문:');
  questionsByCohort.forEach((count, cohortId) => {
    console.log(`    - ${cohortId}: ${count}개`);
  });

  // 7. Profile Answers 통계
  console.log('\n\n📝 Profile Answers (프로필 답변)');
  console.log('-'.repeat(80));
  const answersSnap = await db.collection('profile_answers').get();
  console.log(`총 프로필 답변: ${answersSnap.size}개`);

  const answersByParticipant = new Map<string, number>();
  answersSnap.forEach(doc => {
    const data = doc.data();
    const participantId = data.participantId || 'unknown';
    answersByParticipant.set(participantId, (answersByParticipant.get(participantId) || 0) + 1);
  });

  const avgAnswersPerParticipant = answersSnap.size / answersByParticipant.size;
  console.log(`\n  평균 답변 수/참가자: ${avgAnswersPerParticipant.toFixed(2)}개`);

  // Summary
  console.log('\n\n📊 전체 요약');
  console.log('='.repeat(80));
  console.log(`기수: ${cohortsSnap.size}개`);
  console.log(`참가자: ${participantsSnap.size}명`);
  console.log(`  - 관리자: ${adminCount}명`);
  console.log(`  - 일반 참가자: ${participantsSnap.size - adminCount}명`);
  console.log(`독서 인증: ${submissionsSnap.size}개`);
  console.log(`공지사항: ${noticesSnap.size}개`);
  console.log(`메시지: ${messagesSnap.size}개`);
  console.log(`일일 질문: ${questionsSnap.size}개`);
  console.log(`프로필 답변: ${answersSnap.size}개`);
  console.log('\n' + '='.repeat(80));
}

// 실행
collectStatistics()
  .then(() => {
    console.log('\n✅ 통계 수집 완료\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error);
    process.exit(1);
  });
