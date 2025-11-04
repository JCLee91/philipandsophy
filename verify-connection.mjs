import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

console.log('=== 현재 연결 정보 확인 ===\n');

// 서비스 계정 정보 출력
console.log('1. 서비스 계정 정보:');
console.log(`   - 프로젝트 ID: ${serviceAccount.project_id}`);
console.log(`   - 클라이언트 이메일: ${serviceAccount.client_email}`);
console.log(`   - 프라이빗 키 ID: ${serviceAccount.private_key_id.substring(0, 8)}...`);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Seoul 데이터베이스 연결
const seoulDb = admin.firestore(admin.app(), 'seoul');
console.log('\n2. Seoul 데이터베이스 연결 확인:');
console.log(`   - 데이터베이스 ID: seoul`);
console.log(`   - 리전: asia-northeast3`);

// Default 데이터베이스 연결
const defaultDb = admin.firestore();
console.log('\n3. Default 데이터베이스 연결 확인:');
console.log(`   - 데이터베이스 ID: (default)`);
console.log(`   - 리전: nam5`);

// 실제 데이터 카운트
console.log('\n=== 실제 데이터 확인 ===\n');

// Seoul DB
const seoulSubmissions = await seoulDb.collection('reading_submissions').get();
console.log(`Seoul DB - reading_submissions 컬렉션:`);
console.log(`   - 전체 문서 수: ${seoulSubmissions.size}개`);

// 날짜별 카운트
const dateCount = {};
seoulSubmissions.docs.forEach(doc => {
  const date = doc.data().submissionDate;
  dateCount[date] = (dateCount[date] || 0) + 1;
});

// 11월 데이터만 필터
console.log('\n   11월 데이터:');
Object.keys(dateCount)
  .filter(date => date && date.includes('-11-'))
  .sort()
  .forEach(date => {
    console.log(`   - ${date}: ${dateCount[date]}개`);
  });

// 가장 최근 5개 문서
console.log('\n   최근 생성된 5개 문서:');
const recentDocs = seoulSubmissions.docs
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
  console.log(`   - ${data.participantId}: ${data.submissionDate} (생성: ${createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);
});

// Default DB도 확인
const defaultSubmissions = await defaultDb.collection('reading_submissions').get();
console.log(`\nDefault DB - reading_submissions 컬렉션:`);
console.log(`   - 전체 문서 수: ${defaultSubmissions.size}개`);

console.log('\n=== 결론 ===');
console.log('저는 다음을 보고 있습니다:');
console.log('1. 프로젝트: philipandsophy');
console.log('2. 데이터베이스: seoul (asia-northeast3) 및 default (nam5)');
console.log('3. 컬렉션: reading_submissions');
console.log('4. 인증: firebase-service-account.json 파일 사용');

process.exit(0);