#!/usr/bin/env tsx
/**
 * 1기 상세 통계 생성 스크립트
 *
 * 1기 참가자들의 모든 활동 데이터를 수집하여 상세한 통계를 생성합니다.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Firebase Admin 초기화
function initializeFirebaseAdmin() {
  let app;

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      readFileSync(join(process.cwd(), 'firebase-service-account.json'), 'utf-8')
    );

    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = getApps()[0];
  }

  return getFirestore(app, 'seoul');
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
    });
  } else {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

// 요일 계산
function getDayOfWeek(timestamp: any): string {
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

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
}

// 통계 생성
async function generateCohort1Statistics() {
  const db = initializeFirebaseAdmin();

  console.log('📊 1기 통계 데이터 수집 중...\n');

  // Markdown 문서 생성
  let markdown = '# 필립앤소피 1기 상세 통계 보고서\n\n';
  markdown += `**생성일**: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}\n\n`;
  markdown += '---\n\n';

  // 목차
  markdown += '## 📑 목차\n\n';
  markdown += '1. [전체 개요](#1-전체-개요)\n';
  markdown += '2. [참가자 분석](#2-참가자-분석)\n';
  markdown += '3. [독서 인증 분석](#3-독서-인증-분석)\n';
  markdown += '4. [메시지 활동 분석](#4-메시지-활동-분석)\n';
  markdown += '5. [공지사항 분석](#5-공지사항-분석)\n';
  markdown += '6. [시간대별 활동 분석](#6-시간대별-활동-분석)\n';
  markdown += '7. [참여도 순위](#7-참여도-순위)\n';
  markdown += '8. [도서 분석](#8-도서-분석)\n';
  markdown += '9. [인사이트 및 제언](#9-인사이트-및-제언)\n\n';
  markdown += '---\n\n';

  // 1. 전체 개요
  markdown += '## 1. 전체 개요\n\n';

  const cohortSnap = await db.collection('cohorts').doc('1').get();
  const cohortData = cohortSnap.data();

  markdown += '### 1기 기본 정보\n\n';
  markdown += `- **기수명**: ${cohortData?.name || '1기'}\n`;
  markdown += `- **접근 코드**: ${cohortData?.accessCode || '1234'}\n`;
  markdown += `- **시작일**: ${formatDate(cohortData?.startDate, 'date')}\n`;
  markdown += `- **종료일**: ${formatDate(cohortData?.endDate, 'date')}\n`;
  markdown += `- **상태**: ${cohortData?.isActive ? '진행 중' : '종료'}\n\n`;

  // 참가자 수집
  const participantsSnap = await db.collection('participants')
    .where('cohortId', '==', '1')
    .get();

  const participants: any[] = [];
  participantsSnap.forEach(doc => {
    participants.push({
      id: doc.id,
      ...doc.data()
    });
  });

  // 독서 인증 수집
  const submissionsSnap = await db.collection('reading_submissions')
    .where('cohortId', '==', '1')
    .get();

  const submissions: any[] = [];
  submissionsSnap.forEach(doc => {
    submissions.push({
      id: doc.id,
      ...doc.data()
    });
  });

  // 메시지 수집 (1기 참가자 관련)
  const participantIds = participants.map(p => p.id);
  const messagesSnap = await db.collection('messages').get();
  const messages: any[] = [];
  messagesSnap.forEach(doc => {
    const data = doc.data();
    if (participantIds.includes(data.senderId) || participantIds.includes(data.receiverId)) {
      messages.push({
        id: doc.id,
        ...data
      });
    }
  });

  // 공지사항 수집
  const noticesSnap = await db.collection('notices')
    .where('cohortId', '==', '1')
    .get();

  const notices: any[] = [];
  noticesSnap.forEach(doc => {
    notices.push({
      id: doc.id,
      ...doc.data()
    });
  });

  markdown += '### 주요 지표\n\n';
  markdown += `- **총 참가자**: ${participants.length}명\n`;
  markdown += `- **총 독서 인증**: ${submissions.length}개\n`;
  markdown += `- **총 메시지**: ${messages.length}개\n`;
  markdown += `- **총 공지사항**: ${notices.length}개\n`;
  markdown += `- **1인당 평균 독서 인증**: ${(submissions.length / participants.length).toFixed(2)}개\n`;
  markdown += `- **1인당 평균 메시지**: ${(messages.length / participants.length).toFixed(2)}개\n\n`;

  markdown += '---\n\n';

  // 2. 참가자 분석
  markdown += '## 2. 참가자 분석\n\n';

  const adminCount = participants.filter(p => p.isAdministrator === true).length;
  const regularCount = participants.length - adminCount;

  markdown += '### 참가자 구성\n\n';
  markdown += `- **관리자**: ${adminCount}명\n`;
  markdown += `- **일반 참가자**: ${regularCount}명\n\n`;

  // 성별 분석
  const genderStats = new Map<string, number>();
  participants.forEach(p => {
    const gender = p.gender || '미입력';
    genderStats.set(gender, (genderStats.get(gender) || 0) + 1);
  });

  if (genderStats.size > 0) {
    markdown += '### 성별 분포\n\n';
    markdown += '| 성별 | 인원 | 비율 |\n';
    markdown += '|------|------|------|\n';
    genderStats.forEach((count, gender) => {
      const percentage = ((count / participants.length) * 100).toFixed(1);
      markdown += `| ${gender} | ${count}명 | ${percentage}% |\n`;
    });
    markdown += '\n';
  }

  // 직업 분석
  const occupationStats = new Map<string, number>();
  participants.forEach(p => {
    const occupation = p.occupation || '미입력';
    occupationStats.set(occupation, (occupationStats.get(occupation) || 0) + 1);
  });

  if (occupationStats.size > 0) {
    markdown += '### 직업 분포\n\n';
    const sortedOccupations = Array.from(occupationStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    markdown += '| 순위 | 직업 | 인원 |\n';
    markdown += '|------|------|------|\n';
    sortedOccupations.forEach(([occupation, count], index) => {
      markdown += `| ${index + 1} | ${occupation} | ${count}명 |\n`;
    });
    markdown += '\n';
  }

  // 참가자 목록
  markdown += '### 참가자 명단\n\n';
  markdown += '| 번호 | 이름 | 성별 | 직업 | 관리자 |\n';
  markdown += '|------|------|------|------|--------|\n';
  participants
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .forEach((p, index) => {
      markdown += `| ${index + 1} | ${p.name || 'N/A'} | ${p.gender || 'N/A'} | ${p.occupation || 'N/A'} | ${p.isAdministrator ? '✅' : ''} |\n`;
    });
  markdown += '\n---\n\n';

  // 3. 독서 인증 분석
  markdown += '## 3. 독서 인증 분석\n\n';

  markdown += `### 전체 통계\n\n`;
  markdown += `- **총 독서 인증 수**: ${submissions.length}개\n`;
  markdown += `- **참가자 1인당 평균**: ${(submissions.length / participants.length).toFixed(2)}개\n`;

  // 참가자별 제출 통계
  const submissionsByParticipant = new Map<string, number>();
  const submissionDetails = new Map<string, any[]>();

  submissions.forEach(s => {
    const pid = s.participantId;
    submissionsByParticipant.set(pid, (submissionsByParticipant.get(pid) || 0) + 1);

    if (!submissionDetails.has(pid)) {
      submissionDetails.set(pid, []);
    }
    submissionDetails.get(pid)?.push(s);
  });

  const maxSubmissions = Math.max(...Array.from(submissionsByParticipant.values()));
  const minSubmissions = Math.min(...Array.from(submissionsByParticipant.values()));
  const avgSubmissions = submissions.length / submissionsByParticipant.size;

  markdown += `- **최다 인증**: ${maxSubmissions}개\n`;
  markdown += `- **최소 인증**: ${minSubmissions}개\n`;
  markdown += `- **평균 인증** (제출자 기준): ${avgSubmissions.toFixed(2)}개\n\n`;

  // 인증률
  const participantsWithSubmissions = submissionsByParticipant.size;
  const participationRate = ((participantsWithSubmissions / participants.length) * 100).toFixed(1);
  markdown += `### 참여율\n\n`;
  markdown += `- **인증 제출 참가자**: ${participantsWithSubmissions}명 / ${participants.length}명 (${participationRate}%)\n`;
  markdown += `- **미제출 참가자**: ${participants.length - participantsWithSubmissions}명\n\n`;

  // TOP 10 참가자
  markdown += '### 독서 인증 TOP 10\n\n';
  const topSubmitters = Array.from(submissionsByParticipant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  markdown += '| 순위 | 참가자 ID | 인증 수 |\n';
  markdown += '|------|-----------|--------|\n';
  topSubmitters.forEach(([pid, count], index) => {
    markdown += `| ${index + 1} | ${pid} | ${count}개 |\n`;
  });
  markdown += '\n';

  // 날짜별 제출 통계
  const submissionsByDate = new Map<string, number>();
  submissions.forEach(s => {
    if (s.createdAt) {
      const date = formatDate(s.createdAt, 'date');
      submissionsByDate.set(date, (submissionsByDate.get(date) || 0) + 1);
    }
  });

  markdown += '### 일별 독서 인증 추이\n\n';
  const sortedDates = Array.from(submissionsByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  markdown += '| 날짜 | 인증 수 | 누적 |\n';
  markdown += '|------|---------|------|\n';
  let cumulative = 0;
  sortedDates.forEach(([date, count]) => {
    cumulative += count;
    markdown += `| ${date} | ${count}개 | ${cumulative}개 |\n`;
  });
  markdown += '\n';

  // 요일별 분석
  const submissionsByDayOfWeek = new Map<string, number>();
  submissions.forEach(s => {
    if (s.createdAt) {
      const day = getDayOfWeek(s.createdAt);
      submissionsByDayOfWeek.set(day, (submissionsByDayOfWeek.get(day) || 0) + 1);
    }
  });

  markdown += '### 요일별 독서 인증 분포\n\n';
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  markdown += '| 요일 | 인증 수 | 비율 |\n';
  markdown += '|------|---------|------|\n';
  days.forEach(day => {
    const count = submissionsByDayOfWeek.get(day) || 0;
    const percentage = ((count / submissions.length) * 100).toFixed(1);
    markdown += `| ${day}요일 | ${count}개 | ${percentage}% |\n`;
  });
  markdown += '\n---\n\n';

  // 4. 메시지 활동 분석
  markdown += '## 4. 메시지 활동 분석\n\n';

  markdown += `### 전체 통계\n\n`;
  markdown += `- **총 메시지 수**: ${messages.length}개\n`;
  markdown += `- **1인당 평균 메시지**: ${(messages.length / participants.length).toFixed(2)}개\n\n`;

  // 발신자별 통계
  const messagesBySender = new Map<string, number>();
  messages.forEach(m => {
    const sender = m.senderId || 'unknown';
    messagesBySender.set(sender, (messagesBySender.get(sender) || 0) + 1);
  });

  markdown += '### 메시지 발신 TOP 10\n\n';
  const topSenders = Array.from(messagesBySender.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  markdown += '| 순위 | 발신자 ID | 메시지 수 |\n';
  markdown += '|------|-----------|----------|\n';
  topSenders.forEach(([sender, count], index) => {
    markdown += `| ${index + 1} | ${sender} | ${count}개 |\n`;
  });
  markdown += '\n';

  // 수신자별 통계
  const messagesByReceiver = new Map<string, number>();
  messages.forEach(m => {
    const receiver = m.receiverId || 'unknown';
    messagesByReceiver.set(receiver, (messagesByReceiver.get(receiver) || 0) + 1);
  });

  markdown += '### 메시지 수신 TOP 10\n\n';
  const topReceivers = Array.from(messagesByReceiver.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  markdown += '| 순위 | 수신자 ID | 메시지 수 |\n';
  markdown += '|------|-----------|----------|\n';
  topReceivers.forEach(([receiver, count], index) => {
    markdown += `| ${index + 1} | ${receiver} | ${count}개 |\n`;
  });
  markdown += '\n';

  // 날짜별 메시지
  const messagesByDate = new Map<string, number>();
  messages.forEach(m => {
    if (m.createdAt) {
      const date = formatDate(m.createdAt, 'date');
      messagesByDate.set(date, (messagesByDate.get(date) || 0) + 1);
    }
  });

  markdown += '### 일별 메시지 활동\n\n';
  const sortedMessageDates = Array.from(messagesByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  markdown += '| 날짜 | 메시지 수 |\n';
  markdown += '|------|----------|\n';
  sortedMessageDates.forEach(([date, count]) => {
    markdown += `| ${date} | ${count}개 |\n`;
  });
  markdown += '\n---\n\n';

  // 5. 공지사항 분석
  markdown += '## 5. 공지사항 분석\n\n';

  markdown += `### 전체 통계\n\n`;
  markdown += `- **총 공지사항 수**: ${notices.length}개\n\n`;

  // 작성자별 통계
  const noticesByAuthor = new Map<string, number>();
  notices.forEach(n => {
    const author = n.authorName || 'unknown';
    noticesByAuthor.set(author, (noticesByAuthor.get(author) || 0) + 1);
  });

  markdown += '### 작성자별 공지사항\n\n';
  markdown += '| 작성자 | 공지사항 수 |\n';
  markdown += '|--------|------------|\n';
  noticesByAuthor.forEach((count, author) => {
    markdown += `| ${author} | ${count}개 |\n`;
  });
  markdown += '\n';

  // 공지사항 목록
  markdown += '### 공지사항 목록\n\n';
  const sortedNotices = notices.sort((a, b) => {
    const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(0);
    const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  markdown += '| 날짜 | 제목 | 작성자 |\n';
  markdown += '|------|------|--------|\n';
  sortedNotices.forEach(notice => {
    const title = (notice.title || '').substring(0, 40);
    markdown += `| ${formatDate(notice.createdAt, 'date')} | ${title} | ${notice.authorName || 'N/A'} |\n`;
  });
  markdown += '\n---\n\n';

  // 6. 시간대별 활동 분석
  markdown += '## 6. 시간대별 활동 분석\n\n';

  // 시간대별 독서 인증
  const submissionsByHour = new Map<number, number>();
  submissions.forEach(s => {
    if (s.createdAt) {
      let date: Date;
      if (s.createdAt instanceof Timestamp) {
        date = s.createdAt.toDate();
      } else if (s.createdAt.toDate) {
        date = s.createdAt.toDate();
      } else {
        return;
      }
      const hour = date.getHours();
      submissionsByHour.set(hour, (submissionsByHour.get(hour) || 0) + 1);
    }
  });

  markdown += '### 시간대별 독서 인증\n\n';
  markdown += '| 시간대 | 인증 수 | 비율 |\n';
  markdown += '|--------|---------|------|\n';
  for (let hour = 0; hour < 24; hour++) {
    const count = submissionsByHour.get(hour) || 0;
    const percentage = ((count / submissions.length) * 100).toFixed(1);
    const timeRange = `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:59`;
    const bar = '█'.repeat(Math.floor(count / 2));
    markdown += `| ${timeRange} | ${count}개 ${bar} | ${percentage}% |\n`;
  }
  markdown += '\n';

  // 활동 피크 시간
  const peakHours = Array.from(submissionsByHour.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  markdown += '### 활동 피크 시간대\n\n';
  peakHours.forEach(([hour, count], index) => {
    markdown += `${index + 1}. **${hour}시**: ${count}개 인증\n`;
  });
  markdown += '\n---\n\n';

  // 7. 참여도 순위
  markdown += '## 7. 참여도 순위\n\n';

  // 종합 참여도 계산 (독서 인증 + 메시지)
  const participantScores = new Map<string, any>();

  participants.forEach(p => {
    const submissionCount = submissionsByParticipant.get(p.id) || 0;
    const sentMessageCount = messagesBySender.get(p.id) || 0;
    const receivedMessageCount = messagesByReceiver.get(p.id) || 0;
    const totalScore = (submissionCount * 3) + sentMessageCount + (receivedMessageCount * 0.5);

    participantScores.set(p.id, {
      name: p.name,
      submissions: submissionCount,
      messagesSent: sentMessageCount,
      messagesReceived: receivedMessageCount,
      totalScore: totalScore
    });
  });

  const rankedParticipants = Array.from(participantScores.entries())
    .sort((a, b) => b[1].totalScore - a[1].totalScore)
    .slice(0, 15);

  markdown += '### 종합 참여도 TOP 15\n\n';
  markdown += '*점수 산정: 독서 인증 ×3 + 발신 메시지 ×1 + 수신 메시지 ×0.5*\n\n';
  markdown += '| 순위 | 참가자 ID | 독서 인증 | 발신 메시지 | 수신 메시지 | 종합 점수 |\n';
  markdown += '|------|-----------|-----------|-------------|-------------|----------|\n';
  rankedParticipants.forEach(([pid, data], index) => {
    markdown += `| ${index + 1} | ${pid} | ${data.submissions}개 | ${data.messagesSent}개 | ${data.messagesReceived}개 | ${data.totalScore.toFixed(1)}점 |\n`;
  });
  markdown += '\n---\n\n';

  // 8. 도서 분석
  markdown += '## 8. 도서 분석\n\n';

  const bookStats = new Map<string, number>();
  const bookDetails = new Map<string, any>();

  submissions.forEach(s => {
    const bookTitle = s.bookTitle || '미입력';
    bookStats.set(bookTitle, (bookStats.get(bookTitle) || 0) + 1);

    if (!bookDetails.has(bookTitle) && s.bookTitle) {
      bookDetails.set(bookTitle, {
        author: s.bookAuthor || 'N/A',
        isbn: s.isbn || 'N/A',
        publisher: s.publisher || 'N/A'
      });
    }
  });

  markdown += `### 도서 통계\n\n`;
  markdown += `- **총 도서 수**: ${bookStats.size}권\n`;
  markdown += `- **평균 중복 독서**: ${(submissions.length / bookStats.size).toFixed(2)}회\n\n`;

  // 인기 도서 TOP 10
  markdown += '### 인기 도서 TOP 10\n\n';
  const popularBooks = Array.from(bookStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  markdown += '| 순위 | 도서명 | 저자 | 독서 인증 수 |\n';
  markdown += '|------|--------|------|-------------|\n';
  popularBooks.forEach(([title, count], index) => {
    const details = bookDetails.get(title);
    const author = details?.author || 'N/A';
    markdown += `| ${index + 1} | ${title} | ${author} | ${count}회 |\n`;
  });
  markdown += '\n---\n\n';

  // 9. 인사이트 및 제언
  markdown += '## 9. 인사이트 및 제언\n\n';

  markdown += '### 주요 인사이트\n\n';

  // 참여율 분석
  if (parseFloat(participationRate) >= 80) {
    markdown += `- ✅ **높은 참여율**: ${participationRate}%의 참가자가 독서 인증을 제출하였습니다.\n`;
  } else if (parseFloat(participationRate) >= 60) {
    markdown += `- ⚠️ **중간 참여율**: ${participationRate}%의 참가자가 독서 인증을 제출하였습니다.\n`;
  } else {
    markdown += `- ⚠️ **낮은 참여율**: ${participationRate}%의 참가자만 독서 인증을 제출하였습니다. 참여 독려가 필요합니다.\n`;
  }

  // 활동 패턴
  const topHour = peakHours[0];
  if (topHour) {
    markdown += `- 📊 **피크 시간**: 가장 활발한 시간대는 **${topHour[0]}시**입니다.\n`;
  }

  // 도서 다양성
  const booksPerSubmission = bookStats.size / submissions.length;
  if (booksPerSubmission > 0.7) {
    markdown += `- 📚 **높은 도서 다양성**: 참가자들이 다양한 책을 읽고 있습니다.\n`;
  } else if (booksPerSubmission > 0.3) {
    markdown += `- 📚 **중간 도서 다양성**: 일부 베스트셀러에 집중되는 경향이 있습니다.\n`;
  } else {
    markdown += `- 📚 **낮은 도서 다양성**: 특정 도서에 집중되어 있습니다. 다양한 도서 추천이 필요합니다.\n`;
  }

  // 메시지 활동
  const messageRatio = messages.length / submissions.length;
  if (messageRatio > 0.5) {
    markdown += `- 💬 **활발한 소통**: 독서 인증 대비 메시지 활동이 활발합니다.\n`;
  } else {
    markdown += `- 💬 **소극적 소통**: 독서 인증에 비해 메시지 활동이 적습니다. 소통 활성화가 필요합니다.\n`;
  }

  markdown += '\n### 개선 제언\n\n';

  // 미참여자 대상 제언
  const inactiveCount = participants.length - participantsWithSubmissions;
  if (inactiveCount > 0) {
    markdown += `1. **미참여자 독려**: ${inactiveCount}명의 미참여자에게 개별 연락을 통한 참여 독려\n`;
  }

  // 활동 시간대 기반 제언
  if (topHour && topHour[0] >= 21) {
    markdown += `2. **야간 활동 집중**: 주로 저녁 시간대에 활동이 집중되므로, 공지사항도 저녁에 발송하는 것이 효과적\n`;
  } else if (topHour && topHour[0] <= 9) {
    markdown += `2. **아침 활동 집중**: 주로 아침 시간대에 활동이 집중되므로, 공지사항도 아침에 발송하는 것이 효과적\n`;
  }

  // 도서 다양성 제언
  if (booksPerSubmission < 0.5) {
    markdown += `3. **도서 추천 다양화**: 큐레이션 공지를 통해 다양한 장르의 도서 추천\n`;
  }

  // 소통 활성화 제언
  if (messageRatio < 0.3) {
    markdown += `4. **소통 활성화**: 토론 주제 제공, 질문 게시 등으로 참가자 간 소통 증진\n`;
  }

  markdown += '\n---\n\n';
  markdown += `*본 보고서는 ${new Date().toLocaleDateString('ko-KR')} 기준으로 작성되었습니다.*\n`;

  return markdown;
}

// 실행
generateCohort1Statistics()
  .then(markdown => {
    const outputPath = join(process.cwd(), 'docs', 'cohort1-statistics.md');
    writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`✅ 1기 통계 보고서 생성 완료: ${outputPath}\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error);
    process.exit(1);
  });
