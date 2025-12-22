/**
 * 2기 제출물 통계 분석
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

async function analyzeStats() {
  console.log('📊 2기 제출물 통계 분석 시작...\n');

  try {
    // 1. 2기 참가자 조회
    console.log('👥 1. 2기 참가자 조회...');
    const participantsSnap = await db
      .collection('participants')
      .where('cohortId', '==', '2')
      .get();

    const participants = new Map<string, string>(); // id → name
    participantsSnap.docs.forEach((doc) => {
      participants.set(doc.id, doc.data().name);
    });

    console.log(`✅ ${participants.size}명 발견\n`);

    // 2. 2기 제출물 조회
    console.log('📝 2. 제출물 조회...');
    const submissionsSnap = await db
      .collection('reading_submissions')
      .get();

    // 2기 참가자의 제출물만 필터링
    const cohort2Submissions = submissionsSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((s: any) => participants.has(s.participantId));

    console.log(`✅ ${cohort2Submissions.length}개 제출물 발견\n`);

    // 3. 참가자별 통계 계산
    console.log('🔢 3. 참가자별 통계 계산 중...\n');

    const stats = new Map<string, {
      name: string;
      reviewLengths: number[];
      answerLengths: number[];
      submissions: any[];
    }>();

    cohort2Submissions.forEach((submission: any) => {
      const participantId = submission.participantId;
      const name = participants.get(participantId) || 'Unknown';

      if (!stats.has(participantId)) {
        stats.set(participantId, {
          name,
          reviewLengths: [],
          answerLengths: [],
          submissions: [],
        });
      }

      const stat = stats.get(participantId)!;

      if (submission.review) {
        stat.reviewLengths.push(submission.review.length);
      }

      if (submission.dailyAnswer) {
        stat.answerLengths.push(submission.dailyAnswer.length);
      }

      stat.submissions.push(submission);
    });

    // 4. 평균 독서 소감문 길이
    console.log('📖 4. 평균 독서 소감문 길이 순위:\n');

    const reviewStats = Array.from(stats.entries())
      .map(([id, stat]) => ({
        id,
        name: stat.name,
        avgLength: stat.reviewLengths.length > 0
          ? Math.round(stat.reviewLengths.reduce((a, b) => a + b, 0) / stat.reviewLengths.length)
          : 0,
        count: stat.reviewLengths.length,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.avgLength - a.avgLength);

    console.log('상위 5명:');
    reviewStats.slice(0, 5).forEach((s, index) => {
      console.log(`${index + 1}. ${s.name}: 평균 ${s.avgLength}자 (${s.count}개)`);
    });

    console.log(`\n🏆 1위: ${reviewStats[0].name}`);
    console.log(`   평균 ${reviewStats[0].avgLength}자 (총 ${reviewStats[0].count}개 제출)\n`);

    // 5. 평균 가치관 답변 길이
    console.log('💭 5. 평균 가치관 답변 길이 순위:\n');

    const answerStats = Array.from(stats.entries())
      .map(([id, stat]) => ({
        id,
        name: stat.name,
        avgLength: stat.answerLengths.length > 0
          ? Math.round(stat.answerLengths.reduce((a, b) => a + b, 0) / stat.answerLengths.length)
          : 0,
        count: stat.answerLengths.length,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.avgLength - a.avgLength);

    console.log('상위 5명:');
    answerStats.slice(0, 5).forEach((s, index) => {
      console.log(`${index + 1}. ${s.name}: 평균 ${s.avgLength}자 (${s.count}개)`);
    });

    console.log(`\n🏆 1위: ${answerStats[0].name}`);
    console.log(`   평균 ${answerStats[0].avgLength}자 (총 ${answerStats[0].count}개 제출)\n`);

    // 6. 오전 6시 이후 가장 빨리 인증한 사람
    console.log('🌅 6. 오전 6시 이후 가장 빨리 인증:\n');

    const morningSubmissions = cohort2Submissions
      .filter((s: any) => s.submittedAt)
      .map((s: any) => {
        const submittedDate = s.submittedAt.toDate();
        const kst = toZonedTime(submittedDate, 'Asia/Seoul');
        const hour = kst.getHours();
        const minute = kst.getMinutes();

        return {
          participantId: s.participantId,
          name: participants.get(s.participantId) || 'Unknown',
          submittedAt: kst,
          hour,
          minute,
          timeInMinutes: hour * 60 + minute,
          submissionDate: s.submissionDate,
        };
      })
      .filter((s) => s.hour >= 6) // 오전 6시 이후만
      .sort((a, b) => a.timeInMinutes - b.timeInMinutes);

    if (morningSubmissions.length > 0) {
      const earliest = morningSubmissions[0];
      const timeStr = format(earliest.submittedAt, 'HH:mm:ss');
      const dateStr = format(earliest.submittedAt, 'yyyy-MM-dd');

      console.log(`🏆 ${earliest.name}`);
      console.log(`   날짜: ${dateStr} (${earliest.submissionDate})`);
      console.log(`   시간: ${timeStr}\n`);
    }

    // 7. 오전 2시 이전 가장 늦게 인증한 사람
    console.log('🌙 7. 오전 2시 이전 가장 늦게 인증:\n');

    const lateNightSubmissions = cohort2Submissions
      .filter((s: any) => s.submittedAt)
      .map((s: any) => {
        const submittedDate = s.submittedAt.toDate();
        const kst = toZonedTime(submittedDate, 'Asia/Seoul');
        const hour = kst.getHours();
        const minute = kst.getMinutes();

        return {
          participantId: s.participantId,
          name: participants.get(s.participantId) || 'Unknown',
          submittedAt: kst,
          hour,
          minute,
          timeInMinutes: hour * 60 + minute,
          submissionDate: s.submissionDate,
        };
      })
      .filter((s) => s.hour < 2) // 오전 2시 이전만
      .sort((a, b) => b.timeInMinutes - a.timeInMinutes);

    if (lateNightSubmissions.length > 0) {
      const latest = lateNightSubmissions[0];
      const timeStr = format(latest.submittedAt, 'HH:mm:ss');
      const dateStr = format(latest.submittedAt, 'yyyy-MM-dd');

      console.log(`🏆 ${latest.name}`);
      console.log(`   날짜: ${dateStr} (${latest.submissionDate})`);
      console.log(`   시간: ${timeStr}\n`);
    }

    console.log('✅ 분석 완료!');
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

analyzeStats();
