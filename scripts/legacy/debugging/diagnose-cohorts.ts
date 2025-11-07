#!/usr/bin/env tsx

/**
 * Cohort Synchronization Diagnostic Script
 *
 * Checks:
 * 1. Cohort metadata (dates, programStartDate)
 * 2. Daily questions (14 questions per cohort)
 * 3. Participant count per cohort
 * 4. Notice count per cohort
 * 5. Submission count per cohort
 * 6. Daily matching data
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parseISO, differenceInDays, format } from 'date-fns';
import * as path from 'path';

// Initialize Firebase Admin SDK
const serviceAccount = require(path.resolve(process.cwd(), 'firebase-service-account.json'));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app, 'seoul');

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  programStartDate?: string;
  isActive: boolean;
  dailyFeaturedParticipants?: Record<string, any>;
  [key: string]: any;
}

interface DailyQuestion {
  id: string;
  dayNumber: number;
  date: string;
  category: string;
  question: string;
  [key: string]: any;
}

async function diagnoseCohorts() {
  console.log('🔍 코호트 동기화 진단 시작...\n');

  try {
    // 1. Get all cohorts
    const cohortsSnapshot = await db.collection('cohorts').get();
    const cohorts: Cohort[] = cohortsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Cohort));

    console.log(`📊 총 ${cohorts.length}개 기수 발견\n`);
    console.log('='.repeat(80));

    for (const cohort of cohorts) {
      console.log(`\n📖 기수: ${cohort.name} (ID: ${cohort.id})`);
      console.log('-'.repeat(80));

      // Cohort metadata
      console.log(`\n[메타데이터]`);
      console.log(`  • 시작일 (startDate): ${cohort.startDate}`);
      console.log(`  • 종료일 (endDate): ${cohort.endDate}`);
      console.log(`  • 프로그램 시작일 (programStartDate): ${cohort.programStartDate || '❌ 미설정'}`);
      console.log(`  • 활성화 상태 (isActive): ${cohort.isActive ? '✅ 활성' : '❌ 비활성'}`);

      // Calculate program duration
      if (cohort.startDate && cohort.endDate) {
        const start = parseISO(cohort.startDate);
        const end = parseISO(cohort.endDate);
        const duration = differenceInDays(end, start) + 1;
        console.log(`  • 프로그램 기간: ${duration}일`);
      }

      // Check Daily Questions
      console.log(`\n[Daily Questions]`);
      const questionsSnapshot = await db
        .collection(`cohorts/${cohort.id}/daily_questions`)
        .orderBy('dayNumber', 'asc')
        .get();
      const questions: DailyQuestion[] = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DailyQuestion));

      if (questions.length === 0) {
        console.log(`  ❌ Daily Questions 없음`);
      } else {
        console.log(`  ✅ ${questions.length}개 질문 존재 (예상: 14개)`);

        if (questions.length !== 14) {
          console.log(`  ⚠️  주의: 14개가 아닌 ${questions.length}개 질문 발견`);
        }

        // Check date consistency
        const programStart = cohort.programStartDate || cohort.startDate;
        if (programStart) {
          const startDate = parseISO(programStart);
          const dateIssues: string[] = [];

          questions.forEach(q => {
            const expectedDate = format(
              new Date(startDate.getTime() + (q.dayNumber - 1) * 24 * 60 * 60 * 1000),
              'yyyy-MM-dd'
            );
            if (q.date !== expectedDate) {
              dateIssues.push(`Day ${q.dayNumber}: ${q.date} (예상: ${expectedDate})`);
            }
          });

          if (dateIssues.length > 0) {
            console.log(`  ⚠️  날짜 불일치 발견:`);
            dateIssues.forEach(issue => console.log(`     - ${issue}`));
          } else {
            console.log(`  ✅ 모든 날짜가 programStartDate와 일치`);
          }
        }

        // Show sample questions
        console.log(`\n  [첫 3개 질문 샘플]`);
        questions.slice(0, 3).forEach(q => {
          console.log(`    Day ${q.dayNumber} (${q.date}): ${q.question.substring(0, 50)}...`);
        });
      }

      // Check Participants
      console.log(`\n[참가자]`);
      const participantsSnapshot = await db
        .collection('participants')
        .where('cohortId', '==', cohort.id)
        .get();
      console.log(`  • 참가자 수: ${participantsSnapshot.size}명`);

      // Check admin count
      const admins = participantsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.isAdministrator === true || data.isSuperAdmin === true;
      });
      console.log(`  • 관리자 수: ${admins.length}명`);

      // Check Notices
      console.log(`\n[공지사항]`);
      const noticesSnapshot = await db
        .collection('notices')
        .where('cohortId', '==', cohort.id)
        .get();
      console.log(`  • 공지사항 수: ${noticesSnapshot.size}개`);

      // Check Reading Submissions
      console.log(`\n[독서 인증]`);
      const submissionsSnapshot = await db.collection('reading_submissions').get();
      const cohortSubmissions = submissionsSnapshot.docs.filter(doc => {
        const participantId = doc.data().participantId;
        return participantsSnapshot.docs.some(p => p.id === participantId);
      });
      console.log(`  • 독서 인증 수: ${cohortSubmissions.length}개`);

      // Check Daily Featured Participants (Matching Data)
      console.log(`\n[매칭 데이터]`);
      if (cohort.dailyFeaturedParticipants) {
        const matchingDates = Object.keys(cohort.dailyFeaturedParticipants);
        console.log(`  ✅ ${matchingDates.length}개 날짜의 매칭 데이터 존재`);

        if (matchingDates.length > 0) {
          console.log(`  • 첫 매칭일: ${matchingDates[0]}`);
          console.log(`  • 마지막 매칭일: ${matchingDates[matchingDates.length - 1]}`);
        }
      } else {
        console.log(`  ❌ 매칭 데이터 없음`);
      }

      console.log(`\n${'='.repeat(80)}`);
    }

    console.log('\n\n✅ 진단 완료\n');

    // Summary
    console.log('📋 요약:');
    console.log(`  • 총 기수: ${cohorts.length}개`);
    console.log(`  • 활성 기수: ${cohorts.filter(c => c.isActive).length}개`);
    console.log(`  • programStartDate 미설정: ${cohorts.filter(c => !c.programStartDate).length}개`);

  } catch (error) {
    console.error('❌ 진단 중 오류 발생:', error);
    process.exit(1);
  }
}

// Run diagnostics
diagnoseCohorts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ 실행 오류:', error);
    process.exit(1);
  });
