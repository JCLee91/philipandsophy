#!/usr/bin/env tsx
/**
 * 특별 순위 통계 생성 스크립트
 *
 * 1. 평균 독서 소감문 길이가 가장 긴 사람과 글자수
 * 2. 평균 가치관 답변 길이가 가장 긴 사람, 글자수
 * 3. 가장 많이 필립앤소피 방문한 사람, 방문 횟수
 * 4. 가장 빨리 필립앤소피 인증한 사람, 인증 시간
 * 5. 가장 늦게 필립앤소피 인증한 사람, 인증 시간
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
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

  return getFirestore().database('seoul');
}

// 날짜 포맷 함수
function formatDate(timestamp: any, format: 'full' | 'date' | 'time' = 'full'): string {
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

  if (format === 'date') {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } else if (format === 'time') {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } else {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// 문자열 길이 계산 (공백 제외)
function getTextLength(text: string | undefined | null): number {
  if (!text) return 0;
  return text.replace(/\s/g, '').length;
}

// 통계 생성
async function generateSpecialRankings() {
  const db = initializeFirebaseAdmin();

  console.log('📊 특별 순위 데이터 수집 중...\n');

  let markdown = '# 필립앤소피 특별 순위\n\n';
  markdown += `**생성일**: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}\n\n`;
  markdown += '---\n\n';

  // 1. 평균 독서 소감문 길이
  console.log('1. 독서 소감문 분석 중...');
  markdown += '## 1. 📝 평균 독서 소감문 길이 순위\n\n';

  const submissionsSnap = await db.collection('reading_submissions').get();
  const reviewLengthByParticipant = new Map<string, { totalLength: number; count: number; reviews: string[] }>();

  submissionsSnap.forEach(doc => {
    const data = doc.data();
    const participantId = data.participantId;

    // admin 제외
    if (participantId === 'admin' || participantId === 'testadmin') {
      return;
    }

    const review = data.review || '';
    const reviewLength = getTextLength(review);

    if (!reviewLengthByParticipant.has(participantId)) {
      reviewLengthByParticipant.set(participantId, { totalLength: 0, count: 0, reviews: [] });
    }

    const stats = reviewLengthByParticipant.get(participantId)!;
    stats.totalLength += reviewLength;
    stats.count += 1;
    stats.reviews.push(review);
  });

  // 평균 계산 및 정렬
  const avgReviewLengths = Array.from(reviewLengthByParticipant.entries())
    .map(([participantId, stats]) => ({
      participantId,
      avgLength: stats.totalLength / stats.count,
      totalLength: stats.totalLength,
      count: stats.count,
      reviews: stats.reviews
    }))
    .sort((a, b) => b.avgLength - a.avgLength);

  if (avgReviewLengths.length > 0) {
    const top = avgReviewLengths[0];
    markdown += `### 🥇 1위: **${top.participantId}**\n\n`;
    markdown += `- **평균 소감문 길이**: ${Math.round(top.avgLength)}자\n`;
    markdown += `- **총 인증 수**: ${top.count}회\n`;
    markdown += `- **총 작성 글자 수**: ${top.totalLength}자\n\n`;

    markdown += '### TOP 10 순위\n\n';
    markdown += '| 순위 | 참가자 ID | 평균 길이 | 인증 수 | 총 글자 수 |\n';
    markdown += '|------|-----------|----------|---------|------------|\n';
    avgReviewLengths.slice(0, 10).forEach((item, index) => {
      markdown += `| ${index + 1} | ${item.participantId} | ${Math.round(item.avgLength)}자 | ${item.count}회 | ${item.totalLength}자 |\n`;
    });
    markdown += '\n';

    // 가장 긴 소감문 예시
    if (top.reviews.length > 0) {
      const longestReview = top.reviews.reduce((a, b) => getTextLength(a) > getTextLength(b) ? a : b);
      markdown += '#### 💬 가장 긴 소감문 예시\n\n';
      markdown += '```\n';
      markdown += longestReview.substring(0, 500) + (longestReview.length > 500 ? '...' : '');
      markdown += '\n```\n\n';
    }
  } else {
    markdown += '*독서 인증 데이터가 없습니다.*\n\n';
  }

  markdown += '---\n\n';

  // 2. 평균 가치관 답변 길이 (reading_submissions의 dailyAnswer 필드)
  console.log('2. 가치관 답변 분석 중...');
  markdown += '## 2. 💭 평균 가치관 답변 길이 순위\n\n';

  const answerLengthByParticipant = new Map<string, { totalLength: number; count: number; answers: string[] }>();

  // reading_submissions에서 dailyAnswer 추출
  submissionsSnap.forEach(doc => {
    const data = doc.data();
    const participantId = data.participantId;

    // admin 제외
    if (participantId === 'admin' || participantId === 'testadmin') {
      return;
    }

    const answer = data.dailyAnswer || '';
    const answerLength = getTextLength(answer);

    if (!answerLengthByParticipant.has(participantId)) {
      answerLengthByParticipant.set(participantId, { totalLength: 0, count: 0, answers: [] });
    }

    const stats = answerLengthByParticipant.get(participantId)!;
    stats.totalLength += answerLength;
    stats.count += 1;
    stats.answers.push(answer);
  });

  const avgAnswerLengths = Array.from(answerLengthByParticipant.entries())
    .map(([participantId, stats]) => ({
      participantId,
      avgLength: stats.totalLength / stats.count,
      totalLength: stats.totalLength,
      count: stats.count,
      answers: stats.answers
    }))
    .sort((a, b) => b.avgLength - a.avgLength);

  if (avgAnswerLengths.length > 0) {
    const top = avgAnswerLengths[0];
    markdown += `### 🥇 1위: **${top.participantId}**\n\n`;
    markdown += `- **평균 답변 길이**: ${Math.round(top.avgLength)}자\n`;
    markdown += `- **총 답변 수**: ${top.count}개\n`;
    markdown += `- **총 작성 글자 수**: ${top.totalLength}자\n\n`;

    markdown += '### TOP 10 순위\n\n';
    markdown += '| 순위 | 참가자 ID | 평균 길이 | 답변 수 | 총 글자 수 |\n';
    markdown += '|------|-----------|----------|---------|------------|\n';
    avgAnswerLengths.slice(0, 10).forEach((item, index) => {
      markdown += `| ${index + 1} | ${item.participantId} | ${Math.round(item.avgLength)}자 | ${item.count}개 | ${item.totalLength}자 |\n`;
    });
    markdown += '\n';

    // 가장 긴 답변 예시
    if (top.answers.length > 0) {
      const longestAnswer = top.answers.reduce((a, b) => getTextLength(a) > getTextLength(b) ? a : b);
      markdown += '#### 💬 가장 긴 답변 예시\n\n';
      markdown += '```\n';
      markdown += longestAnswer.substring(0, 300) + (longestAnswer.length > 300 ? '...' : '');
      markdown += '\n```\n\n';
    }
  } else {
    markdown += '*가치관 답변 데이터가 없습니다.*\n\n';
  }

  markdown += '---\n\n';

  // 3. 가장 많이 방문한 사람 (로그인 기록 기반)
  console.log('3. 방문 횟수 분석 중...');
  markdown += '## 3. 🚪 가장 많이 방문한 참가자\n\n';

  // 참가자 데이터에서 lastLoginAt 또는 활동 로그 확인
  const participantsSnap = await db.collection('participants').get();
  const visitCounts = new Map<string, number>();

  // 각 컬렉션의 활동을 기반으로 방문 횟수 추정
  // (독서 인증 + 메시지 발신 + 프로필 답변) = 최소 방문 횟수
  submissionsSnap.forEach(doc => {
    const participantId = doc.data().participantId;
    if (participantId === 'admin' || participantId === 'testadmin') return;
    visitCounts.set(participantId, (visitCounts.get(participantId) || 0) + 1);
  });

  const messagesSnap = await db.collection('messages').get();
  messagesSnap.forEach(doc => {
    const senderId = doc.data().senderId;
    if (senderId && senderId !== 'admin' && senderId !== 'testadmin') {
      visitCounts.set(senderId, (visitCounts.get(senderId) || 0) + 1);
    }
  });

  // dailyAnswer 작성도 방문으로 카운트 (reading_submissions에 포함됨으로 중복 제거)
  // 이미 submissionsSnap에서 카운트됨

  const sortedVisits = Array.from(visitCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  if (sortedVisits.length > 0) {
    const top = sortedVisits[0];
    markdown += `### 🥇 1위: **${top[0]}**\n\n`;
    markdown += `- **추정 방문 횟수**: ${top[1]}회\n`;
    markdown += `- *독서 인증, 메시지 발신, 프로필 답변을 기준으로 산정*\n\n`;

    markdown += '### TOP 10 순위\n\n';
    markdown += '| 순위 | 참가자 ID | 추정 방문 횟수 |\n';
    markdown += '|------|-----------|----------------|\n';
    sortedVisits.slice(0, 10).forEach(([participantId, count], index) => {
      markdown += `| ${index + 1} | ${participantId} | ${count}회 |\n`;
    });
    markdown += '\n';
  } else {
    markdown += '*활동 데이터가 없습니다.*\n\n';
  }

  markdown += '---\n\n';

  // 4. 가장 빨리 인증한 사람
  console.log('4. 최초 인증 시간 분석 중...');
  markdown += '## 4. ⏰ 가장 빨리 독서 인증한 참가자\n\n';

  const submissionsWithTime: Array<{ participantId: string; createdAt: any; bookTitle: string; date: Date }> = [];
  submissionsSnap.forEach(doc => {
    const data = doc.data();

    // admin 제외
    if (data.participantId === 'admin' || data.participantId === 'testadmin') {
      return;
    }

    if (data.createdAt) {
      let date: Date;
      if (data.createdAt instanceof Timestamp) {
        date = data.createdAt.toDate();
      } else if (data.createdAt.toDate) {
        date = data.createdAt.toDate();
      } else {
        return;
      }

      submissionsWithTime.push({
        participantId: data.participantId,
        createdAt: data.createdAt,
        bookTitle: data.bookTitle || '제목 없음',
        date
      });
    }
  });

  submissionsWithTime.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (submissionsWithTime.length > 0) {
    const earliest = submissionsWithTime[0];
    markdown += `### 🥇 최초 인증자: **${earliest.participantId}**\n\n`;
    markdown += `- **인증 시간**: ${formatDate(earliest.createdAt)}\n`;
    markdown += `- **도서명**: ${earliest.bookTitle}\n\n`;

    markdown += '### TOP 10 순위\n\n';
    markdown += '| 순위 | 참가자 ID | 인증 시간 | 도서명 |\n';
    markdown += '|------|-----------|-----------|--------|\n';
    submissionsWithTime.slice(0, 10).forEach((item, index) => {
      markdown += `| ${index + 1} | ${item.participantId} | ${formatDate(item.createdAt)} | ${item.bookTitle} |\n`;
    });
    markdown += '\n';
  } else {
    markdown += '*독서 인증 데이터가 없습니다.*\n\n';
  }

  markdown += '---\n\n';

  // 5. 가장 늦은 시간대에 인증한 사람 (하루 중 가장 늦은 시간 = 23시대)
  console.log('5. 가장 늦은 시간대 인증 분석 중...');
  markdown += '## 5. 🌙 가장 늦은 시간대에 독서 인증한 참가자\n\n';

  // 시간대별로 정렬 (23시가 가장 늦음, 0시는 제외)
  const lateNightSubmissions = submissionsWithTime
    .filter(item => {
      const hour = item.date.getHours();
      return hour >= 1; // 0시(자정) 제외
    })
    .sort((a, b) => {
      const hourA = a.date.getHours();
      const hourB = b.date.getHours();
      const minuteA = a.date.getMinutes();
      const minuteB = b.date.getMinutes();

      // 시간 내림차순, 같은 시간이면 분 내림차순
      if (hourB !== hourA) return hourB - hourA;
      return minuteB - minuteA;
    });

  if (lateNightSubmissions.length > 0) {
    const latest = lateNightSubmissions[0];
    markdown += `### 🥇 가장 늦은 시간 인증자: **${latest.participantId}**\n\n`;
    markdown += `- **인증 시간**: ${formatDate(latest.createdAt)}\n`;
    markdown += `- **도서명**: ${latest.bookTitle}\n\n`;

    markdown += '### 가장 늦은 시간 TOP 10\n\n';
    markdown += '| 순위 | 참가자 ID | 인증 시간 | 도서명 |\n';
    markdown += '|------|-----------|-----------|--------|\n';
    lateNightSubmissions.slice(0, 10).forEach((item, index) => {
      markdown += `| ${index + 1} | ${item.participantId} | ${formatDate(item.createdAt)} | ${item.bookTitle} |\n`;
    });
    markdown += '\n';
  } else {
    markdown += '*독서 인증 데이터가 없습니다.*\n\n';
  }

  markdown += '---\n\n';
  markdown += `*본 보고서는 ${new Date().toLocaleDateString('ko-KR')} 기준으로 작성되었습니다.*\n`;

  return markdown;
}

// 실행
generateSpecialRankings()
  .then(markdown => {
    const outputPath = join(process.cwd(), 'special-rankings.md');
    writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`\n✅ 특별 순위 보고서 생성 완료: ${outputPath}\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error);
    process.exit(1);
  });
