import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
 * 모든 참가자의 occupation 정보 업데이트
 *
 * 이미지 파일에서 추출한 occupation 정보를 기반으로 DB 업데이트
 */

const OCCUPATION_DATA = [
  { name: '박지영', occupation: '공공기관 조사관' },
  { name: '최종호', occupation: '호텔 센터팀장' },
  { name: '서민석', occupation: '회계법인 컨설턴트' },
  { name: '서현명', occupation: '공기업 사무직' },
  { name: '김산하', occupation: '반도체업 전략기획' },
  { name: '하진영', occupation: '공무원' },
  { name: '이인재', occupation: '자동차 제조업 연구원' },
  { name: '이예림', occupation: '교사' },
  { name: '유하람', occupation: '유튜버' },
  { name: '손다진', occupation: '유통업 조직문화기획' },
  { name: '이지현', occupation: '엔터업 보컬트레이너' },
  { name: '김청랑', occupation: '바이오 기업 세무사' },
  { name: '김정현', occupation: '화장품 기업 온라인 MD' },
  { name: '김동현', occupation: '위성 연구원' },
  { name: '방유라', occupation: '통신업 사업기획' },
  { name: '유진욱', occupation: '화학제조업 연구개발' },
  { name: '조현우', occupation: 'IT 기업 프로젝트 매니저' },
  { name: '전승훈', occupation: '보험업 프로젝트 매니저' },
  { name: '김민준', occupation: 'IT 기업 프로젝트 매니저' },
  { name: '이윤지', occupation: 'F&B 기업 상품기획' },
];

async function updateAllOccupations() {
  try {
    console.log('🔄 모든 참가자의 occupation 업데이트 시작...\n');

    let successCount = 0;
    let failCount = 0;
    const failedNames: string[] = [];

    for (const { name, occupation } of OCCUPATION_DATA) {
      try {
        // 이름으로 참가자 찾기
        const participantsSnapshot = await db
          .collection('participants')
          .where('name', '==', name)
          .limit(1)
          .get();

        if (participantsSnapshot.empty) {
          console.log(`⚠️  참가자를 찾을 수 없음: ${name}`);
          failCount++;
          failedNames.push(name);
          continue;
        }

        const participantDoc = participantsSnapshot.docs[0];
        const participantId = participantDoc.id;

        // occupation 업데이트
        await db.collection('participants').doc(participantId).update({
          occupation,
          updatedAt: Timestamp.now(),
        });

        console.log(`✅ ${name}: ${occupation}`);
        successCount++;

      } catch (error) {
        console.error(`❌ ${name} 업데이트 실패:`, error);
        failCount++;
        failedNames.push(name);
      }
    }

    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 업데이트 결과 요약');
    console.log('='.repeat(50));
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${failCount}명`);

    if (failedNames.length > 0) {
      console.log(`\n실패한 참가자 목록:`);
      failedNames.forEach(name => console.log(`  - ${name}`));
    }

    console.log('\n🎉 모든 작업이 완료되었습니다!');

  } catch (error) {
    console.error('❌ 전체 프로세스 에러:', error);
    throw error;
  }
}

// 스크립트 실행
updateAllOccupations()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
