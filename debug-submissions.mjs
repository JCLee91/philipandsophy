import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(admin.app(), 'seoul');

async function debugSubmissions() {
  console.log('=== Firebase 데이터 디버깅 ===\n');

  // 1. 전체 컬렉션 문서 개수 확인
  const allDocs = await db.collection('reading_submissions').get();
  console.log(`전체 reading_submissions 문서 개수: ${allDocs.size}개\n`);

  // 2. submissionDate 필드가 있는 문서 확인
  const docsWithDate = allDocs.docs.filter(doc => {
    const data = doc.data();
    return data.submissionDate !== undefined;
  });
  console.log(`submissionDate 필드가 있는 문서: ${docsWithDate.length}개\n`);

  // 3. 모든 고유한 submissionDate 값 확인
  const uniqueDates = new Set();
  const dateDetails = {};

  allDocs.docs.forEach(doc => {
    const data = doc.data();
    const date = data.submissionDate;

    if (date) {
      uniqueDates.add(date);

      if (!dateDetails[date]) {
        dateDetails[date] = {
          count: 0,
          samples: [],
          types: new Set()
        };
      }

      dateDetails[date].count++;
      dateDetails[date].types.add(typeof date);

      if (dateDetails[date].samples.length < 2) {
        dateDetails[date].samples.push({
          id: doc.id,
          participantId: data.participantId,
          rawDate: date,
          type: typeof date
        });
      }
    }
  });

  console.log('=== 모든 고유한 submissionDate 값 ===\n');
  const sortedDates = Array.from(uniqueDates).sort();
  sortedDates.forEach(date => {
    console.log(`📅 ${date}: ${dateDetails[date].count}개 문서`);
    console.log(`  타입: ${Array.from(dateDetails[date].types).join(', ')}`);
    console.log(`  샘플:`);
    dateDetails[date].samples.forEach(sample => {
      console.log(`    - ${sample.participantId} (ID: ${sample.id})`);
    });
  });

  // 4. 11월 3일, 4일 특정 검색
  console.log('\n=== 특정 날짜 검색 시도 ===\n');

  const datesToCheck = [
    '2024-11-03',
    '2024-11-04',
    '2025-11-03',
    '2025-11-04',
    '11-03',
    '11-04',
    '2024/11/03',
    '2024/11/04'
  ];

  for (const dateStr of datesToCheck) {
    const query = await db.collection('reading_submissions')
      .where('submissionDate', '==', dateStr)
      .get();

    if (query.size > 0) {
      console.log(`✅ "${dateStr}" 형식으로 ${query.size}개 문서 발견!`);
    }
  }

  // 5. 11월 데이터만 필터링 (문자열 포함 검색)
  console.log('\n=== 11월 데이터 필터링 ===\n');

  const novemberDocs = allDocs.docs.filter(doc => {
    const data = doc.data();
    const date = data.submissionDate;
    return date && typeof date === 'string' && date.includes('11-');
  });

  console.log(`11월 관련 문서: ${novemberDocs.length}개\n`);

  if (novemberDocs.length > 0) {
    // 날짜별로 그룹화
    const novemberByDate = {};
    novemberDocs.forEach(doc => {
      const data = doc.data();
      const date = data.submissionDate;

      if (!novemberByDate[date]) {
        novemberByDate[date] = [];
      }
      novemberByDate[date].push(data.participantId);
    });

    Object.keys(novemberByDate)
      .sort()
      .forEach(date => {
        console.log(`${date}: ${novemberByDate[date].length}명`);
        console.log(`  참가자: ${novemberByDate[date].slice(0, 5).join(', ')}${novemberByDate[date].length > 5 ? '...' : ''}\n`);
      });
  }

  // 6. 가장 최근 문서 5개의 상세 정보
  console.log('=== 가장 최근 문서 5개 상세 ===\n');

  const recentDocs = await db.collection('reading_submissions')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  recentDocs.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`[${index + 1}] 문서 ID: ${doc.id}`);
    console.log(`  participantId: ${data.participantId}`);
    console.log(`  submissionDate: ${data.submissionDate} (type: ${typeof data.submissionDate})`);
    console.log(`  status: ${data.status}`);

    if (data.createdAt) {
      const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt._seconds * 1000);
      console.log(`  createdAt: ${createdDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    }
    console.log('');
  });

  process.exit(0);
}

debugSubmissions().catch(console.error);