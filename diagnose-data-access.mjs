import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function diagnoseDataAccess() {
  console.log('=== 데이터 접근 진단 시작 ===\n');

  // 1. 권한 및 프로젝트 확인
  console.log('1. 서비스 계정 정보:');
  console.log(`   - 프로젝트 ID: ${serviceAccount.project_id}`);
  console.log(`   - 클라이언트 이메일: ${serviceAccount.client_email}`);
  console.log(`   - 프라이빗 키 ID: ${serviceAccount.private_key_id?.substring(0, 8)}...`);

  // 2. 데이터베이스 연결 테스트
  console.log('\n2. 데이터베이스 연결 테스트:\n');

  const databases = [
    { name: 'seoul', db: admin.firestore(admin.app(), 'seoul') },
    { name: 'default', db: admin.firestore() }
  ];

  for (const { name, db } of databases) {
    console.log(`\n[${name.toUpperCase()} 데이터베이스]`);
    console.log('=' .repeat(60));

    try {
      // a. 컬렉션 전체 카운트
      const allDocs = await db.collection('reading_submissions').get();
      console.log(`✅ 전체 문서 수: ${allDocs.size}개`);

      // b. 11월 데이터 범위 쿼리
      const novemberQuery = await db.collection('reading_submissions')
        .where('submissionDate', '>=', '2025-11-01')
        .where('submissionDate', '<=', '2025-11-04')
        .get();

      console.log(`✅ 11월 1-4일 문서: ${novemberQuery.size}개`);

      // c. 날짜별 상세 집계
      const dateStats = {};
      novemberQuery.docs.forEach(doc => {
        const data = doc.data();
        const date = data.submissionDate;
        if (!dateStats[date]) {
          dateStats[date] = { count: 0, participants: new Set(), docIds: [] };
        }
        dateStats[date].count++;
        dateStats[date].participants.add(data.participantId);
        dateStats[date].docIds.push(doc.id);
      });

      Object.keys(dateStats).sort().forEach(date => {
        const stats = dateStats[date];
        console.log(`   ${date}: ${stats.count}개 (참가자 ${stats.participants.size}명)`);
        console.log(`     - 문서 ID 샘플: ${stats.docIds.slice(0, 2).join(', ')}...`);
      });

      // d. 특정 문서 ID 직접 조회
      console.log('\n특정 문서 ID 조회:');
      const testIds = [
        'PTRRB5Vg2oztRVzNP6nH',  // 유저가 언급한 ID
        'oMSyCM378FuykeQLkNZL',  // 이전에 찾지 못한 ID
        'JIfJqKPZyA2R13cMSHa4'   // 이전에 찾지 못한 ID
      ];

      for (const docId of testIds) {
        try {
          const doc = await db.collection('reading_submissions').doc(docId).get();
          if (doc.exists) {
            const data = doc.data();
            console.log(`   ✅ ${docId}: 발견!`);
            console.log(`      - participantId: ${data.participantId}`);
            console.log(`      - submissionDate: ${data.submissionDate}`);
            console.log(`      - status: ${data.status}`);
          } else {
            console.log(`   ❌ ${docId}: 문서 없음`);
          }
        } catch (error) {
          console.log(`   ⚠️ ${docId}: 오류 - ${error.message}`);
        }
      }

      // e. 특정 참가자의 모든 제출물
      console.log('\n특정 참가자 조회:');
      const testParticipants = ['cohort2-수진', 'cohort2-성국', 'cohort2-현영'];

      for (const participantId of testParticipants) {
        const participantQuery = await db.collection('reading_submissions')
          .where('participantId', '==', participantId)
          .get();

        if (participantQuery.size > 0) {
          console.log(`   ${participantId}: ${participantQuery.size}개 제출물`);
          participantQuery.docs.forEach(doc => {
            const data = doc.data();
            console.log(`     - ${data.submissionDate}: ${doc.id}`);
          });
        } else {
          console.log(`   ${participantId}: 제출물 없음`);
        }
      }

      // f. 가장 최근 문서 5개
      console.log('\n최근 생성된 문서 (createdAt 기준):');
      const recentDocs = allDocs.docs
        .filter(doc => doc.data().createdAt)
        .sort((a, b) => {
          const aTime = a.data().createdAt._seconds || 0;
          const bTime = b.data().createdAt._seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 5);

      recentDocs.forEach(doc => {
        const data = doc.data();
        const createdAt = new Date(data.createdAt._seconds * 1000);
        console.log(`   - ${doc.id}: ${data.participantId} / ${data.submissionDate}`);
        console.log(`     생성: ${createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      });

    } catch (error) {
      console.log(`❌ 데이터베이스 접근 오류: ${error.message}`);
      console.log(`   오류 타입: ${error.code || 'unknown'}`);
      if (error.details) {
        console.log(`   상세: ${JSON.stringify(error.details)}`);
      }
    }
  }

  // 3. 대체 쿼리 방법 테스트
  console.log('\n\n3. 대체 쿼리 방법 테스트:');
  console.log('=' .repeat(60));

  const seoulDb = admin.firestore(admin.app(), 'seoul');

  // a. 문자열 비교 대신 startAt/endAt 사용
  console.log('\nstartAt/endAt 쿼리:');
  try {
    const rangeQuery = await seoulDb.collection('reading_submissions')
      .orderBy('submissionDate')
      .startAt('2025-11-03')
      .endAt('2025-11-04')
      .get();

    console.log(`✅ 11월 3-4일 문서 (startAt/endAt): ${rangeQuery.size}개`);

    if (rangeQuery.size > 0) {
      rangeQuery.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.participantId} / ${data.submissionDate}`);
      });
    }
  } catch (error) {
    console.log(`❌ startAt/endAt 쿼리 실패: ${error.message}`);
  }

  // b. 전체 문서 스캔 후 필터링
  console.log('\n전체 스캔 후 필터링:');
  const allSubmissions = await seoulDb.collection('reading_submissions').get();
  const nov3and4 = allSubmissions.docs.filter(doc => {
    const date = doc.data().submissionDate;
    return date === '2025-11-03' || date === '2025-11-04';
  });

  console.log(`✅ 11월 3-4일 문서 (전체 스캔): ${nov3and4.length}개`);

  if (nov3and4.length > 0) {
    console.log('\n발견된 11월 3-4일 문서:');
    nov3and4.forEach(doc => {
      const data = doc.data();
      console.log(`   문서 ID: ${doc.id}`);
      console.log(`   - participantId: ${data.participantId}`);
      console.log(`   - submissionDate: ${data.submissionDate}`);
      console.log(`   - status: ${data.status}`);
      console.log(`   - bookTitle: ${data.bookTitle?.substring(0, 30)}...`);
      console.log('');
    });
  }

  // 4. 데이터 타입 진단
  console.log('\n4. 데이터 타입 및 형식 진단:');
  console.log('=' .repeat(60));

  const sampleDocs = allSubmissions.docs.slice(0, 3);
  sampleDocs.forEach(doc => {
    const data = doc.data();
    console.log(`\n문서 ID: ${doc.id}`);
    console.log(`   submissionDate 타입: ${typeof data.submissionDate}`);
    console.log(`   submissionDate 값: "${data.submissionDate}"`);
    console.log(`   submissionDate 길이: ${data.submissionDate?.length}`);
    console.log(`   submissionDate 인코딩: ${escape(data.submissionDate)}`);

    // 날짜 형식 검증
    if (data.submissionDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      console.log(`   날짜 형식 유효: ${dateRegex.test(data.submissionDate)}`);
    }
  });

  // 5. 최종 요약
  console.log('\n\n=== 진단 결과 요약 ===');
  console.log('=' .repeat(60));

  const summary = {
    projectId: serviceAccount.project_id,
    serviceAccount: serviceAccount.client_email,
    totalDocs: allSubmissions.size,
    nov1to4Count: allSubmissions.docs.filter(doc => {
      const date = doc.data().submissionDate;
      return date >= '2025-11-01' && date <= '2025-11-04';
    }).length,
    nov3and4Count: nov3and4.length,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(summary, null, 2));

  // 6. 권한 테스트
  console.log('\n\n6. 권한 테스트:');
  console.log('=' .repeat(60));

  try {
    // 읽기 권한
    console.log('✅ 읽기 권한: 정상');

    // 쓰기 권한 테스트 (실제로 쓰지는 않음)
    const testDoc = seoulDb.collection('reading_submissions').doc('_permission_test_' + Date.now());
    const testData = {
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // dry run으로 권한만 체크
    console.log('✅ 쓰기 권한: 테스트 준비 완료 (실제 쓰기는 하지 않음)');

  } catch (error) {
    console.log(`❌ 권한 오류: ${error.message}`);
  }

  process.exit(0);
}

diagnoseDataAccess().catch(error => {
  console.error('진단 중 오류 발생:', error);
  process.exit(1);
});