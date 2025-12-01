#!/usr/bin/env tsx
/**
 * 2시 전환 엣지케이스 영향 받은 submission 조회
 *
 * 조건: submittedAt이 새벽 2:00~2:30 사이인데 submissionDate가 "오늘"로 저장된 건
 * (전날로 저장되어야 했던 건들)
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';
import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

function safeTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return null;
}

async function checkEdgeCaseSubmissions() {
  console.log('🔍 2시 전환 엣지케이스 영향 받은 submission 조회 시작...\n');

  const { db } = getFirebaseAdmin();

  // approved submission 전체 조회 (인덱스 필요 없는 단일 필터)
  const snapshot = await db.collection('reading_submissions')
    .where('status', '==', 'approved')
    .get();

  // 최근 30일만 필터링
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log(`총 ${snapshot.size}개 submission 확인 중...\n`);

  interface EdgeCase {
    id: string;
    participantId: string;
    bookTitle: string;
    submittedAt: string;
    submissionDate: string;
    expectedDate: string;
    cohortId: string;
  }

  const edgeCases: EdgeCase[] = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const submittedAt = safeTimestampToDate(data.submittedAt);
    const submissionDate = data.submissionDate;

    if (!submittedAt || !submissionDate) return;

    // 최근 30일만 필터링
    if (submittedAt < thirtyDaysAgo) return;

    // KST로 변환
    const submittedAtKST = toZonedTime(submittedAt, 'Asia/Seoul');
    const hour = submittedAtKST.getHours();
    const minute = submittedAtKST.getMinutes();

    // 새벽 2:00~2:30 사이 제출인지 확인
    if (hour === 2 && minute < 30) {
      // 이 시간대에 제출했으면 submissionDate는 "전날"이어야 함
      const expectedDate = format(subDays(submittedAtKST, 1), 'yyyy-MM-dd');
      const actualDate = submissionDate;

      // submissionDate가 전날이 아니라 "오늘"로 되어 있는 경우 = 엣지케이스
      if (actualDate !== expectedDate) {
        edgeCases.push({
          id: doc.id,
          participantId: data.participantId,
          bookTitle: data.bookTitle || 'N/A',
          submittedAt: format(submittedAtKST, 'yyyy-MM-dd HH:mm:ss'),
          submissionDate: actualDate,
          expectedDate: expectedDate,
          cohortId: data.cohortId || 'N/A',
        });
      }
    }
  });

  console.log('='.repeat(80));
  console.log(`🚨 엣지케이스 발견: ${edgeCases.length}건`);
  console.log('='.repeat(80));

  if (edgeCases.length === 0) {
    console.log('\n✅ 영향 받은 submission이 없습니다!');
  } else {
    console.log('\n영향 받은 submission 목록:\n');
    edgeCases.forEach((item, index) => {
      console.log(`${index + 1}. ${item.id}`);
      console.log(`   참가자: ${item.participantId}`);
      console.log(`   책: ${item.bookTitle}`);
      console.log(`   제출 시간: ${item.submittedAt} KST`);
      console.log(`   현재 submissionDate: ${item.submissionDate} ❌`);
      console.log(`   올바른 submissionDate: ${item.expectedDate} ✅`);
      console.log(`   기수: ${item.cohortId}`);
      console.log('');
    });

    console.log('\n📋 수정이 필요한 건들:');
    edgeCases.forEach(item => {
      console.log(`- ${item.id}: ${item.submissionDate} → ${item.expectedDate}`);
    });
  }

  process.exit(0);
}

checkEdgeCaseSubmissions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
