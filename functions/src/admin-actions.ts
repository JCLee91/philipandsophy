import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * 관리자(Super Admin)가 특정 유저로 로그인하기 위한 Custom Token 발급
 */
export const getImpersonationToken = functions.https.onCall(async (request) => {
  // 1. 호출자 인증 확인
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '로그인이 필요합니다.'
    );
  }

  const callerUid = request.auth.uid;
  const targetUid = request.data.targetUid;

  if (!targetUid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '대상 유저 UID가 필요합니다.'
    );
  }

  try {
    // 2. 호출자가 Super Admin인지 확인
    // Custom Claims를 쓰지 않고 Participant 문서를 직접 조회하여 권한 확인
    const adminSnapshot = await admin.firestore()
      .collection('participants')
      .where('firebaseUid', '==', callerUid)
      .limit(1)
      .get();

    if (adminSnapshot.empty) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '관리자 정보를 찾을 수 없습니다.'
      );
    }

    const adminData = adminSnapshot.docs[0].data();
    // Super Admin 또는 General Administrator 모두 허용
    if (adminData.isSuperAdmin !== true && adminData.isAdministrator !== true) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '관리자 권한이 필요합니다.'
      );
    }

    // 3. 대상 유저 존재 여부 확인 (선택사항, 안전을 위해)
    const userRecord = await admin.auth().getUser(targetUid);
    if (!userRecord) {
      throw new functions.https.HttpsError(
        'not-found',
        '대상 유저를 찾을 수 없습니다.'
      );
    }

    // 4. Custom Token 생성
    // developerClaims에 impersonator 정보를 넣으면 클라이언트에서 식별 가능
    const customToken = await admin.auth().createCustomToken(targetUid, {
      impersonatorUid: callerUid // 원래 관리자의 UID를 클레임에 포함
    });

    return { customToken };

  } catch (error) {
    console.error('[getImpersonationToken] Error:', error);
    // 이미 HttpsError인 경우 그대로 던짐
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      '토큰 생성 중 오류가 발생했습니다.'
    );
  }
});

