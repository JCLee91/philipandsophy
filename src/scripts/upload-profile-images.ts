/**
 * Upload Profile Images to Firebase Storage
 * 20명의 참가자 프로필 이미지를 Firebase Storage에 업로드하고
 * Firestore participants 컬렉션을 업데이트합니다.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

// 업로드할 프로필 이미지 정보 (20명 전체)
const PROFILE_IMAGES = [
  {
    name: '박지영',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/1_박지영.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/박지영.png',
    storagePath: 'profiles/park-jiyoung-profile.png',
    circleStoragePath: 'profiles/park-jiyoung-circle.png',
  },
  {
    name: '최종호',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/2_최종호.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/최종호.png',
    storagePath: 'profiles/choi-jongho-profile.png',
    circleStoragePath: 'profiles/choi-jongho-circle.png',
  },
  {
    name: '서민석',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/3_서민석.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/서민석.png',
    storagePath: 'profiles/seo-minseok-profile.png',
    circleStoragePath: 'profiles/seo-minseok-circle.png',
  },
  {
    name: '서현명',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/4_서현명.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/서현명.png',
    storagePath: 'profiles/seo-hyunmyung-profile.png',
    circleStoragePath: 'profiles/seo-hyunmyung-circle.png',
  },
  {
    name: '김산하',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/5_김산하.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/김산하.png',
    storagePath: 'profiles/kim-sanha-profile.png',
    circleStoragePath: 'profiles/kim-sanha-circle.png',
  },
  {
    name: '하진영',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/6_하진영.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/하진영.png',
    storagePath: 'profiles/ha-jinyoung-profile.png',
    circleStoragePath: 'profiles/ha-jinyoung-circle.png',
  },
  {
    name: '이인재',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/7_이인재.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/이인재.png',
    storagePath: 'profiles/lee-injae-profile.png',
    circleStoragePath: 'profiles/lee-injae-circle.png',
  },
  {
    name: '이예림',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/8_이예림.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/이예림.png',
    storagePath: 'profiles/lee-yerim-profile.png',
    circleStoragePath: 'profiles/lee-yerim-circle.png',
  },
  {
    name: '유하람',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/9_유하람.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/유하람.png',
    storagePath: 'profiles/yoo-haram-profile.png',
    circleStoragePath: 'profiles/yoo-haram-circle.png',
  },
  {
    name: '손다진',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/10_손다진.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/손다진.png',
    storagePath: 'profiles/son-dajin-profile.png',
    circleStoragePath: 'profiles/son-dajin-circle.png',
  },
  {
    name: '이지현',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/11_이지현.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/이지현.png',
    storagePath: 'profiles/lee-jihyun-profile.png',
    circleStoragePath: 'profiles/lee-jihyun-circle.png',
  },
  {
    name: '김청랑',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/12_김청랑.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/김청랑.png',
    storagePath: 'profiles/kim-cheonglang-profile.png',
    circleStoragePath: 'profiles/kim-cheonglang-circle.png',
  },
  {
    name: '김정현',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/13_김정현.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/김정현.png',
    storagePath: 'profiles/kim-junghyun-profile.png',
    circleStoragePath: 'profiles/kim-junghyun-circle.png',
  },
  {
    name: '김동현',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/14_김동현.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/김동현.png',
    storagePath: 'profiles/kim-donghyun-profile.png',
    circleStoragePath: 'profiles/kim-donghyun-circle.png',
  },
  {
    name: '방유라',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/15_방유라.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/방유라.png',
    storagePath: 'profiles/bang-yura-profile.png',
    circleStoragePath: 'profiles/bang-yura-circle.png',
  },
  {
    name: '유진욱',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/16_유진욱.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/유진욱.png',
    storagePath: 'profiles/yoo-jinwook-profile.png',
    circleStoragePath: 'profiles/yoo-jinwook-circle.png',
  },
  {
    name: '조현우',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/17_조현우.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/조현우.png',
    storagePath: 'profiles/jo-hyunwoo-profile.png',
    circleStoragePath: 'profiles/jo-hyunwoo-circle.png',
  },
  {
    name: '전승훈',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/18_전승훈.png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/전승훈.png',
    storagePath: 'profiles/jeon-seunghun-profile.png',
    circleStoragePath: 'profiles/jeon-seunghun-circle.png',
  },
  {
    name: '김민준',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/Profile_1기_김민준 (1).png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/김민준.png',
    storagePath: 'profiles/kim-minjun-profile.png',
    circleStoragePath: 'profiles/kim-minjun-circle.png',
  },
  {
    name: '이윤지',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/Profile_1기_이윤지 (1).png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/이윤지.png',
    storagePath: 'profiles/lee-yoonji-profile.png',
    circleStoragePath: 'profiles/lee-yoonji-circle.png',
  },
];

/**
 * 파일을 Firebase Storage에 업로드
 */
async function uploadFile(localPath: string, storagePath: string): Promise<string> {
  console.log(`📤 업로드 중: ${path.basename(localPath)} → ${storagePath}`);

  // 파일 존재 확인
  if (!fs.existsSync(localPath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${localPath}`);
  }

  // Firebase Storage에 업로드
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000', // 1년 캐시
    },
  });

  // 파일을 public으로 설정
  const file = bucket.file(storagePath);
  await file.makePublic();

  // Public URL 생성
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`✅ 업로드 완료: ${publicUrl}`);

  return publicUrl;
}

/**
 * Firestore에서 참가자 찾기 (이름으로)
 */
async function findParticipantByName(name: string) {
  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.where('name', '==', name).limit(1).get();

  if (snapshot.empty) {
    console.warn(`⚠️  "${name}" 참가자를 찾을 수 없습니다.`);
    return null;
  }

  return snapshot.docs[0];
}

/**
 * Firestore 참가자 문서 업데이트
 */
async function updateParticipantImage(
  name: string,
  profileImageUrl: string,
  profileImageCircleUrl: string
) {
  const participantDoc = await findParticipantByName(name);

  if (!participantDoc) {
    return;
  }

  await participantDoc.ref.update({
    profileImage: profileImageUrl,
    profileImageCircle: profileImageCircleUrl,
    updatedAt: new Date(),
  });

  console.log(`✅ Firestore 업데이트 완료: ${name} → ${participantDoc.id}`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 프로필 이미지 업로드 시작\n');

  for (const profile of PROFILE_IMAGES) {
    console.log(`\n📋 처리 중: ${profile.name}`);
    console.log('─'.repeat(50));

    try {
      // 1. 큰 프로필 이미지 업로드 (members_10)
      const profileUrl = await uploadFile(profile.localPath, profile.storagePath);

      // 2. 원형 프로필 이미지 업로드 (profil-circle)
      console.log(`📤 원형 이미지 업로드 중...`);
      const circleUrl = await uploadFile(profile.circlePath, profile.circleStoragePath);

      // 3. Firestore 업데이트 (큰 이미지 + 원형 이미지 모두 저장)
      await updateParticipantImage(profile.name, profileUrl, circleUrl);

      console.log(`\n✅ ${profile.name} 처리 완료!`);
    } catch (error) {
      console.error(`\n❌ ${profile.name} 처리 실패:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 모든 프로필 이미지 업로드 완료!');
  console.log('='.repeat(50));
}

// 스크립트 실행
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
