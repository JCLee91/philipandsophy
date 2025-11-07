#!/usr/bin/env tsx
/**
 * 어제 날짜로 인증한 모든 참가자 조회 스크립트
 * Admin SDK를 사용하여 서울 리전 DB에 접근
 *
 * 사용법: npm run check:yesterday-submissions
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';
import { getYesterdayString, getSubmissionDate } from '../lib/date-utils';

async function checkYesterdaySubmissions() {
  try {
    const { db } = getFirebaseAdmin();
    const yesterday = getYesterdayString();
    // ✅ FIX: 새벽 2시 마감 정책 적용
    const today = getSubmissionDate();

    console.log('==================================================');
    console.log('어제 날짜로 인증한 참가자 조회');
    console.log('==================================================');
    console.log(`오늘 날짜: ${today}`);
    console.log(`어제 날짜: ${yesterday}`);
    console.log('--------------------------------------------------');

    // 어제 날짜로 된 모든 제출물 조회
    const submissionsSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', yesterday)
      .get();

    if (submissionsSnap.empty) {
      console.log('\n❌ 어제 날짜로 인증한 사람이 없습니다.');
      return;
    }

    console.log(`\n✅ 어제 인증자 수: ${submissionsSnap.size}명\n`);

    // 각 제출물에 대한 상세 정보 수집
    const submissions: any[] = [];
    for (const docSnap of submissionsSnap.docs) {
      const data = docSnap.data();

      // 참가자 정보 조회
      let participantInfo: any = null;
      if (data.participantId) {
        const participantSnap = await db
          .collection('participants')
          .doc(data.participantId)
          .get();
        if (participantSnap.exists) {
          participantInfo = participantSnap.data();
        }
      }

      // 기수 정보 조회
      let cohortInfo: any = null;
      if (participantInfo?.cohortId) {
        const cohortSnap = await db
          .collection('cohorts')
          .doc(participantInfo.cohortId)
          .get();
        if (cohortSnap.exists) {
          cohortInfo = cohortSnap.data();
        }
      }

      submissions.push({
        submissionId: docSnap.id,
        participantId: data.participantId,
        participantName: participantInfo?.name || '이름 없음',
        cohortId: participantInfo?.cohortId || '기수 없음',
        cohortNumber: cohortInfo?.cohortNumber || '?',
        submissionDate: data.submissionDate,
        bookTitle: data.bookTitle,
        bookAuthor: data.bookAuthor,
        readingStatus: data.readingStatus,
        rating: data.rating,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }

    // 기수별로 그룹화
    const byCohort = submissions.reduce((acc: any, sub) => {
      const key = `${sub.cohortNumber}기 (${sub.cohortId})`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(sub);
      return acc;
    }, {});

    // 기수별로 출력
    for (const [cohortKey, cohortSubs] of Object.entries(byCohort)) {
      const subs = cohortSubs as any[];
      console.log(`\n📚 ${cohortKey}`);
      console.log('--------------------------------------------------');

      subs.sort((a, b) => a.participantName.localeCompare(b.participantName));

      subs.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.participantName} (${sub.participantId})`);
        console.log(`   📖 책: ${sub.bookTitle} - ${sub.bookAuthor}`);
        console.log(`   📅 제출일: ${sub.submissionDate}`);
        console.log(`   ⭐ 평점: ${sub.rating}/5`);
        console.log(`   📝 읽기 상태: ${sub.readingStatus}`);
        console.log(`   🔖 상태: ${sub.status}`);
        if (sub.createdAt) {
          const createdDate = sub.createdAt.toDate ? sub.createdAt.toDate() : new Date(sub.createdAt);
          console.log(`   ⏰ 제출 시각: ${createdDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        }
        console.log();
      });
    }

    // 통계
    console.log('\n==================================================');
    console.log('📊 통계');
    console.log('==================================================');
    console.log(`총 인증자: ${submissions.length}명`);

    const statusCounts = submissions.reduce((acc: any, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n상태별 분포:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}명`);
    });

    const readingStatusCounts = submissions.reduce((acc: any, sub) => {
      acc[sub.readingStatus] = (acc[sub.readingStatus] || 0) + 1;
      return acc;
    }, {});

    console.log('\n읽기 상태별 분포:');
    Object.entries(readingStatusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}명`);
    });

    console.log('\n기수별 분포:');
    Object.entries(byCohort).forEach(([cohort, subs]) => {
      const cohortSubs = subs as any[];
      console.log(`  - ${cohort}: ${cohortSubs.length}명`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 메인 함수 실행
checkYesterdaySubmissions()
  .then(() => {
    console.log('\n✅ 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });