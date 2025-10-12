import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { format, subDays } from 'date-fns';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

/**
 * 어제 날짜로 독서 인증 데이터 추가 스크립트
 *
 * 사용법:
 * 1. 이 파일의 SUBMISSION_DATA 객체를 수정하여 제출할 데이터 입력
 * 2. npm run add:backdated-submission 실행
 */

// ========================================
// 여기를 수정하세요!
// ========================================
const SUBMISSION_DATA = {
  // 필수: 참가자 전화번호 (예: '01012345678' 또는 '42633467921')
  phoneNumber: '01046905953',

  // 필수: 책 제목
  bookTitle: '귀욤미소 ㅡ 아가씨와 밤(2025 이전버전)',

  // 선택: 책 저자
  bookAuthor: '',

  // 필수: 간단 감상평
  review: '첫 도입부분을 읽었어요. 밀수업자.. 어떤 무엇을 밀수할지, 도입부를 어떻게 잡느냐에 따라 눈길을 확 끌어 당기는 대목이 좋아요',

  // 필수: 오늘의 질문
  dailyQuestion: '꽃꽂이할 때',

  // 필수: 오늘의 질문에 대한 답변
  dailyAnswer: '이파리 다듬고 가시제거하고 꽃을 어떻게 배열할까 어케 꽃을까 고민하다보면 세상 모르게 시간이 흐르고 있어요',

  // 선택: 책 표지 URL (네이버 API 등에서 가져온 표지)
  bookCoverUrl: '',

  // 선택: 책 설명
  bookDescription: '',

  // 필수: 인증 사진 URL (Firebase Storage 등에 업로드 후 URL)
  // 임시로 placeholder 이미지 사용 가능
  bookImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',

  // 며칠 전으로 소급할지 (1 = 어제, 2 = 그저께)
  daysAgo: 1,
};

async function addBackdatedSubmission() {
  try {
    console.log('🔍 참가자 정보 조회 중...');

    // 1. 전화번호로 참가자 찾기
    const participantsSnapshot = await db
      .collection('participants')
      .where('phoneNumber', '==', SUBMISSION_DATA.phoneNumber)
      .limit(1)
      .get();

    if (participantsSnapshot.empty) {
      throw new Error(`❌ 전화번호 ${SUBMISSION_DATA.phoneNumber}에 해당하는 참가자를 찾을 수 없습니다.`);
    }

    const participantDoc = participantsSnapshot.docs[0];
    const participantData = participantDoc.data();
    const participantId = participantDoc.id;

    console.log(`✅ 참가자 발견: ${participantData.name} (ID: ${participantId})`);

    // 2. 소급 날짜 계산
    const now = new Date();
    const targetDate = subDays(now, SUBMISSION_DATA.daysAgo);
    const submissionDate = format(targetDate, 'yyyy-MM-dd');
    const timestamp = Timestamp.fromDate(targetDate);

    console.log(`📅 제출 날짜: ${submissionDate} (${SUBMISSION_DATA.daysAgo}일 전)`);

    // 3. 독서 인증 데이터 생성
    const submissionData = {
      participantId,
      participationCode: participantData.phoneNumber, // 전화번호를 participation code로 사용
      bookTitle: SUBMISSION_DATA.bookTitle,
      bookAuthor: SUBMISSION_DATA.bookAuthor || '',
      bookCoverUrl: SUBMISSION_DATA.bookCoverUrl || '',
      bookDescription: SUBMISSION_DATA.bookDescription || '',
      bookImageUrl: SUBMISSION_DATA.bookImageUrl,
      review: SUBMISSION_DATA.review,
      dailyQuestion: SUBMISSION_DATA.dailyQuestion,
      dailyAnswer: SUBMISSION_DATA.dailyAnswer,
      submittedAt: timestamp,
      submissionDate,
      status: 'approved', // 자동 승인
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 4. Firestore에 저장
    const docRef = await db.collection('reading_submissions').add(submissionData);

    console.log('✅ 독서 인증 추가 완료!');
    console.log(`   문서 ID: ${docRef.id}`);
    console.log(`   참가자: ${participantData.name}`);
    console.log(`   책 제목: ${SUBMISSION_DATA.bookTitle}`);
    console.log(`   제출 날짜: ${submissionDate}`);

    // 5. (선택) 참가자의 현재 읽는 책 정보 업데이트
    if (SUBMISSION_DATA.bookTitle && SUBMISSION_DATA.bookAuthor) {
      await db.collection('participants').doc(participantId).update({
        currentBookTitle: SUBMISSION_DATA.bookTitle,
        currentBookAuthor: SUBMISSION_DATA.bookAuthor,
        currentBookCoverUrl: SUBMISSION_DATA.bookCoverUrl || '',
        updatedAt: Timestamp.now(),
      });
      console.log('✅ 참가자 프로필 업데이트 완료 (현재 읽는 책)');
    }

    console.log('\n🎉 모든 작업이 완료되었습니다!');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
addBackdatedSubmission()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
