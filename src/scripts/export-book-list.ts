/**
 * 독서 인증에서 제출된 모든 책 목록 추출
 */

import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 환경 변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function exportBookList() {
  console.log('🔥 Firebase Admin SDK 초기화 중...');

  // Admin SDK 초기화
  if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
        }),
      });
    }
  }

  const db = admin.firestore();

  console.log('📚 독서 인증 데이터 조회 중...');
  const snapshot = await db.collection('reading_submissions').get();

  console.log(`총 ${snapshot.size}개의 인증 데이터 발견\n`);

  // 책 제목별로 그룹화 (중복 제거)
  const bookMap = new Map<string, { title: string; author?: string; count: number }>();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const title = data.bookTitle;
    const author = data.bookAuthor || '저자 미상';

    if (title) {
      const key = `${title}|||${author}`;
      if (bookMap.has(key)) {
        const existing = bookMap.get(key)!;
        existing.count += 1;
      } else {
        bookMap.set(key, { title, author, count: 1 });
      }
    }
  });

  // 인증 횟수 내림차순 정렬
  const bookList = Array.from(bookMap.values()).sort((a, b) => b.count - a.count);

  console.log('📖 인증된 책 목록 (총 ' + bookList.length + '권)\n');
  console.log('='.repeat(80));

  bookList.forEach((book, index) => {
    console.log(`${index + 1}. ${book.title}`);
    console.log(`   저자: ${book.author}`);
    console.log(`   인증 횟수: ${book.count}회\n`);
  });

  console.log('='.repeat(80));
  console.log(`\n총 고유 책: ${bookList.length}권`);
  console.log(`총 인증 횟수: ${snapshot.size}회`);
}

exportBookList()
  .then(() => {
    console.log('\n✅ 책 목록 추출 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
