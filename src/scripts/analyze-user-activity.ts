#!/usr/bin/env node
/**
 * 유저별 활동 내역 종합 분석 스크립트
 *
 * 실행 방법:
 * npx tsx src/scripts/analyze-user-activity.ts
 *
 * 분석 항목:
 * 1. 참가자별 독서 인증 제출 횟수
 * 2. 참가자별 읽은 책 수
 * 3. 참가자별 평균 리뷰 길이
 * 4. 참가자별 답변 참여도
 * 5. 참가자별 DM 전송 횟수
 * 6. 최근 활동일
 * 7. 활동 기간 (첫 제출 ~ 마지막 제출)
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// Firebase Admin SDK 초기화
const serviceAccount = JSON.parse(
  readFileSync(join(process.cwd(), 'firebase-service-account.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'philipandsophy',
  });
}

const db = admin.firestore();

interface UserActivity {
  participantId: string;
  name: string;
  phoneNumber: string;
  cohortId: string;
  role: string;
  isAdministrator: boolean;

  // 독서 인증 활동
  totalSubmissions: number;
  uniqueBooksRead: number;
  currentBook: string | null;
  averageReviewLength: number;
  averageAnswerLength: number;

  // 날짜 정보
  firstSubmissionDate: string | null;
  lastSubmissionDate: string | null;
  activityDays: number;

  // DM 활동
  dmSentCount: number;

  // 추가 정보
  createdAt: string;
}

interface ParticipantDoc extends admin.firestore.DocumentData {
  name?: string;
  phoneNumber?: string;
  cohortId?: string;
  role?: string;
  isAdministrator?: boolean;
  isSuperAdmin?: boolean;
  currentBookTitle?: string;
  createdAt?: admin.firestore.Timestamp;
}

interface SubmissionDoc extends admin.firestore.DocumentData {
  participantId?: string;
  bookTitle?: string;
  review?: string;
  dailyAnswer?: string;
  submittedAt?: admin.firestore.Timestamp;
}

interface MessageDoc extends admin.firestore.DocumentData {
  senderId?: string;
  createdAt?: admin.firestore.Timestamp;
}

async function analyzeUserActivity() {
  console.log('\n🔍 유저별 활동 내역 종합 분석 시작...\n');

  try {
    // 1. 모든 참가자 조회
    const participantsSnapshot = await db.collection('participants').get();
    const participants = participantsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as ParticipantDoc),
    }));

    console.log(`📊 총 참가자 수: ${participants.length}명\n`);

    // 2. 모든 독서 인증 조회
    const submissionsSnapshot = await db.collection('reading_submissions').get();
    const submissions = submissionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as SubmissionDoc),
    }));

    // 3. 모든 메시지 조회 (DM 분석)
    const messagesSnapshot = await db.collection('messages').get();
    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as MessageDoc),
    }));

    // 4. 참가자별 활동 내역 계산
    const activities: UserActivity[] = [];

    for (const participant of participants) {
      const participantId = participant.id;

      // 해당 참가자의 독서 인증 필터링
      const userSubmissions = submissions.filter(
        sub => sub.participantId === participantId
      );

      // 해당 참가자가 보낸 DM 필터링
      const userMessages = messages.filter(
        msg => msg.senderId === participantId
      );

      // 읽은 책 목록 (중복 제거)
      const uniqueBooks = new Set(
        userSubmissions.map(sub => sub.bookTitle).filter(Boolean)
      );

      // 리뷰 길이 평균 계산
      const reviewLengths = userSubmissions
        .map(sub => sub.review?.length || 0)
        .filter(len => len > 0);
      const avgReviewLength = reviewLengths.length > 0
        ? Math.round(reviewLengths.reduce((sum, len) => sum + len, 0) / reviewLengths.length)
        : 0;

      // 답변 길이 평균 계산
      const answerLengths = userSubmissions
        .map(sub => sub.dailyAnswer?.length || 0)
        .filter(len => len > 0);
      const avgAnswerLength = answerLengths.length > 0
        ? Math.round(answerLengths.reduce((sum, len) => sum + len, 0) / answerLengths.length)
        : 0;

      // 날짜 정보 계산
      const submissionDates = userSubmissions
        .map(sub => {
          if (sub.submittedAt?.toDate) {
            return sub.submittedAt.toDate();
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => (a as Date).getTime() - (b as Date).getTime());

      const firstDate = submissionDates[0];
      const lastDate = submissionDates[submissionDates.length - 1];

      // 활동 기간 (일수)
      let activityDays = 0;
      if (firstDate && lastDate) {
        activityDays = Math.ceil(
          ((lastDate as Date).getTime() - (firstDate as Date).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
      }

      // 생성일
      const createdAt = participant.createdAt?.toDate
        ? format(participant.createdAt.toDate(), 'yyyy-MM-dd HH:mm', { locale: ko })
        : '-';

      activities.push({
        participantId,
        name: participant.name || '이름 없음',
        phoneNumber: participant.phoneNumber || '-',
        cohortId: participant.cohortId || '-',
        role: participant.role || 'participant',
        isAdministrator: participant.isAdministrator || false,

        totalSubmissions: userSubmissions.length,
        uniqueBooksRead: uniqueBooks.size,
        currentBook: participant.currentBookTitle || null,
        averageReviewLength: avgReviewLength,
        averageAnswerLength: avgAnswerLength,

        firstSubmissionDate: firstDate
          ? format(firstDate as Date, 'yyyy-MM-dd', { locale: ko })
          : null,
        lastSubmissionDate: lastDate
          ? format(lastDate as Date, 'yyyy-MM-dd', { locale: ko })
          : null,
        activityDays,

        dmSentCount: userMessages.length,

        createdAt,
      });
    }

    // 5. 제출 횟수 기준 내림차순 정렬
    activities.sort((a, b) => b.totalSubmissions - a.totalSubmissions);

    // 6. 결과 출력
    console.log('=' .repeat(120));
    console.log('📋 유저별 활동 내역 종합');
    console.log('='.repeat(120));
    console.log(
      '순위'.padEnd(4) +
      '이름'.padEnd(12) +
      '역할'.padEnd(12) +
      '독서인증'.padEnd(10) +
      '읽은책'.padEnd(8) +
      '현재책'.padEnd(20) +
      '평균리뷰'.padEnd(10) +
      '평균답변'.padEnd(10) +
      'DM전송'.padEnd(8) +
      '활동기간(일)'.padEnd(12) +
      '최근활동일'
    );
    console.log('-'.repeat(120));

    activities.forEach((activity, index) => {
      const rank = (index + 1).toString().padEnd(4);
      const name = activity.name.padEnd(12);
      const role = (activity.isAdministrator ? '관리자' : '참가자').padEnd(12);
      const submissions = activity.totalSubmissions.toString().padEnd(10);
      const books = activity.uniqueBooksRead.toString().padEnd(8);
      const currentBook = (activity.currentBook || '-').substring(0, 18).padEnd(20);
      const avgReview = activity.averageReviewLength.toString().padEnd(10);
      const avgAnswer = activity.averageAnswerLength.toString().padEnd(10);
      const dmCount = activity.dmSentCount.toString().padEnd(8);
      const days = activity.activityDays.toString().padEnd(12);
      const lastDate = activity.lastSubmissionDate || '-';

      console.log(
        rank + name + role + submissions + books + currentBook +
        avgReview + avgAnswer + dmCount + days + lastDate
      );
    });

    console.log('='.repeat(120));

    // 7. 통계 요약
    const totalUsers = activities.length;
    const activeUsers = activities.filter(a => a.totalSubmissions > 0).length;
    const inactiveUsers = totalUsers - activeUsers;
    const totalSubmissions = activities.reduce((sum, a) => sum + a.totalSubmissions, 0);
    const avgSubmissionsPerUser = totalUsers > 0 ? (totalSubmissions / totalUsers).toFixed(1) : '0';
    const totalDMs = activities.reduce((sum, a) => sum + a.dmSentCount, 0);

    console.log('\n📈 통계 요약');
    console.log('-'.repeat(60));
    console.log(`총 참가자 수: ${totalUsers}명`);
    console.log(`활성 사용자 (1회 이상 제출): ${activeUsers}명`);
    console.log(`비활성 사용자 (제출 없음): ${inactiveUsers}명`);
    console.log(`총 독서 인증 제출: ${totalSubmissions}회`);
    console.log(`평균 제출 횟수/유저: ${avgSubmissionsPerUser}회`);
    console.log(`총 DM 전송: ${totalDMs}건`);
    console.log('-'.repeat(60));

    // 8. TOP 5 활동 유저
    console.log('\n🏆 TOP 5 활동 유저');
    console.log('-'.repeat(60));
    activities.slice(0, 5).forEach((activity, index) => {
      console.log(
        `${index + 1}위: ${activity.name} - ${activity.totalSubmissions}회 제출, ${activity.uniqueBooksRead}권 독서`
      );
    });
    console.log('-'.repeat(60));

    // 9. 비활성 유저 (제출 0회)
    const inactiveUsersList = activities.filter(a => a.totalSubmissions === 0);
    if (inactiveUsersList.length > 0) {
      console.log('\n⚠️  비활성 유저 목록 (독서 인증 제출 없음)');
      console.log('-'.repeat(60));
      inactiveUsersList.forEach(activity => {
        console.log(`• ${activity.name} (가입일: ${activity.createdAt})`);
      });
      console.log('-'.repeat(60));
    }

    // 10. JSON 파일로 저장 (선택사항)
    const outputPath = join(process.cwd(), 'user-activity-report.json');
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalSubmissions,
        avgSubmissionsPerUser: parseFloat(avgSubmissionsPerUser),
        totalDMs,
      },
      activities,
    };

    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`\n✅ 상세 리포트가 저장되었습니다: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ 분석 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
analyzeUserActivity()
  .then(() => {
    console.log('✅ 분석 완료!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
