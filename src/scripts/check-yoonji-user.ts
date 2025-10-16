import { getAdminDb } from '@/lib/firebase/admin';

async function checkYoonjiUser() {
  try {
    const db = getAdminDb();
    const participantsRef = db.collection('participants');
    
    // 이윤지-4321 유저 조회
    const snapshot = await participantsRef.where('id', '==', '이윤지-4321').get();
    
    if (snapshot.empty) {
      console.log('❌ 이윤지-4321 유저를 찾을 수 없습니다.');
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('✅ 이윤지-4321 유저 정보:');
    console.log('  Document ID:', doc.id);
    console.log('  이름:', data.name);
    console.log('  전화번호:', data.phoneNumber);
    console.log('  isAdministrator:', data.isAdministrator);
    console.log('  firebaseUid:', data.firebaseUid || '❌ 연결 안 됨');
    console.log('  cohortId:', data.cohortId);
    
    console.log('\n🔍 토글이 안 보이는 이유 분석:');
    if (!data.firebaseUid) {
      console.log('  ⚠️  firebaseUid가 없습니다!');
      console.log('  → 전화번호 인증을 해야 Firebase UID가 연결됩니다.');
      console.log('  → 전화번호:', data.phoneNumber);
    } else {
      console.log('  ✅ firebaseUid 연결됨:', data.firebaseUid);
      if (data.isAdministrator) {
        console.log('  ✅ isAdministrator: true');
        console.log('  → 토글이 표시되어야 합니다!');
      } else {
        console.log('  ❌ isAdministrator:', data.isAdministrator);
      }
    }
    
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

checkYoonjiUser();
