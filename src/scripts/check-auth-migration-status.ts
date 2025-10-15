/**
 * Firebase Auth 마이그레이션 상태 체크
 *
 * 확인 항목:
 * 1. 전체 참가자 수
 * 2. firebaseUid가 있는 참가자 수
 * 3. firebaseUid가 없는 참가자 수 (마이그레이션 필요)
 * 4. sessionToken만 있는 참가자 수 (구 시스템 유저)
 *
 * 사용법: npx tsx src/scripts/check-auth-migration-status.ts
 */

require('dotenv').config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMigrationStatus() {
  try {
    console.log('🔍 Firebase Auth 마이그레이션 상태 확인 중...\n');

    const participantsRef = collection(db, 'participants');
    const snapshot = await getDocs(participantsRef);

    const stats = {
      total: 0,
      withFirebaseUid: 0,
      withoutFirebaseUid: 0,
      withSessionToken: 0,
      needsMigration: [] as Array<{
        id: string;
        name: string;
        phoneNumber: string;
        hasSessionToken: boolean;
        isAdmin: boolean;
      }>,
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      stats.total++;

      if (data.firebaseUid) {
        stats.withFirebaseUid++;
      } else {
        stats.withoutFirebaseUid++;
        stats.needsMigration.push({
          id: doc.id,
          name: data.name,
          phoneNumber: data.phoneNumber,
          hasSessionToken: !!data.sessionToken,
          isAdmin: data.isAdmin || data.isAdministrator || false,
        });
      }

      if (data.sessionToken) {
        stats.withSessionToken++;
      }
    });

    // 결과 출력
    console.log('📊 마이그레이션 상태 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`총 참가자 수: ${stats.total}명`);
    console.log(`Firebase Auth 연동 완료: ${stats.withFirebaseUid}명 ✅`);
    console.log(`Firebase Auth 연동 필요: ${stats.withoutFirebaseUid}명 ⚠️`);
    console.log(`구 세션 토큰 보유: ${stats.withSessionToken}명`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (stats.needsMigration.length > 0) {
      console.log('⚠️  Firebase Auth 연동이 필요한 참가자 목록:\n');
      stats.needsMigration.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.phoneNumber})`);
        console.log(`   - Document ID: ${user.id}`);
        console.log(`   - 세션 토큰: ${user.hasSessionToken ? '있음' : '없음'}`);
        console.log(`   - 관리자: ${user.isAdmin ? '예' : '아니오'}`);
        console.log('');
      });

      console.log('\n📋 마이그레이션 계획:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('1. 기존 유저는 첫 로그인 시 자동으로 Firebase Auth와 연동됩니다.');
      console.log('   - 전화번호 + SMS 인증 진행');
      console.log('   - 성공 시 firebaseUid 자동 연결');
      console.log('');
      console.log('2. sessionToken은 마이그레이션 완료 후 제거 예정입니다.');
      console.log('   - 현재는 호환성을 위해 유지');
      console.log('   - 추후 일괄 삭제 스크립트 실행');
      console.log('');
      console.log('3. 유저에게 공지 필요:');
      console.log('   "앱 업데이트로 인해 재로그인이 필요합니다."');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('✅ 모든 참가자가 Firebase Auth와 연동되었습니다!\n');
    }

    // 마이그레이션 진행률
    const progress = stats.total > 0
      ? ((stats.withFirebaseUid / stats.total) * 100).toFixed(1)
      : '0.0';

    console.log(`🎯 마이그레이션 진행률: ${progress}% (${stats.withFirebaseUid}/${stats.total})\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

checkMigrationStatus();
