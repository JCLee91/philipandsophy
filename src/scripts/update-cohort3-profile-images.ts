/**
 * 3기 참가자 프로필 이미지 연결
 *
 * Storage: cohorts/cohort3/profiles/ 폴더의 이미지를
 * Firestore 참가자 문서에 연결
 *
 * 실행 방법:
 * npm run update:cohort3-images
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app, 'seoul');
const bucket = getStorage(app).bucket();

const COHORT_ID = '3';
const STORAGE_PREFIX = 'cohorts/cohort3/profiles/';

async function updateProfileImages() {
  console.log('🖼️  3기 프로필 이미지 업데이트 시작...\n');

  try {
    // 1. Storage에서 프로필 이미지 목록 조회
    console.log('📂 1. Storage 이미지 목록 조회...');
    const [files] = await bucket.getFiles({
      prefix: STORAGE_PREFIX,
    });

    console.log(`✅ ${files.length}개 파일 발견\n`);

    // 2. 이미지를 참가자별로 그룹화
    const imageMap = new Map<string, {
      full?: string;
      circle?: string;
    }>();

    /**
     * 전체 이름에서 성을 제외한 이름 추출
     * 예: "강예진" → "예진"
     */
    function extractGivenName(fullName: string): string {
      if (fullName.length <= 2) return fullName;
      return fullName.slice(1);
    }

    console.log('🔍 파일명 파싱 디버깅 (처음 10개 파일):\n');

    let debugCount = 0;
    files.forEach((file) => {
      let fileName = file.name.replace(STORAGE_PREFIX, '');

      // 빈 파일명 스킵 (폴더 자체)
      if (!fileName) {
        return;
      }

      // 🔧 한글 NFD → NFC 정규화 (macOS 파일명 호환)
      fileName = fileName.normalize('NFC');

      if (debugCount < 10) {
        console.log(`${debugCount + 1}. 파일명: "${fileName}"`);
      }

      // _1200x1200은 먼저 제외 (리사이즈 버전)
      if (fileName.includes('_1200x1200')) {
        if (debugCount < 10) {
          console.log(`   ⏭️  스킵: 리사이즈 버전\n`);
          debugCount++;
        }
        return;
      }

      // Profile_3기_이름.png 또는 Circle_3기_이름.png 형식
      const profileMatch = fileName.match(/^Profile_3기_([^.]+)\.png$/);
      const circleMatch = fileName.match(/^Circle_3기_([^.]+)\.png$/);

      if (debugCount < 10) {
        console.log(`   Profile 매치: ${profileMatch ? 'YES' : 'NO'}`);
        console.log(`   Circle 매치: ${circleMatch ? 'YES' : 'NO'}`);
      }

      let fullName: string | null = null;
      let imageType: 'full' | 'circle' | null = null;

      if (profileMatch) {
        fullName = profileMatch[1];
        imageType = 'full';
        if (debugCount < 10) {
          console.log(`   ✅ Profile 매치: "${fullName}"`);
        }
      } else if (circleMatch) {
        fullName = circleMatch[1];
        imageType = 'circle';
        if (debugCount < 10) {
          console.log(`   ✅ Circle 매치: "${fullName}"`);
        }
      } else {
        if (debugCount < 10) {
          console.log(`   ❌ 매치 실패 (정규식 불일치)`);
        }
      }

      if (fullName && imageType) {
        // 성 제외하여 참가자 ID 생성
        const givenName = extractGivenName(fullName);
        const participantId = `cohort3-${givenName}`;

        if (debugCount < 10) {
          console.log(`   → 참가자 ID: ${participantId}\n`);
        }

        if (!imageMap.has(participantId)) {
          imageMap.set(participantId, {});
        }

        const images = imageMap.get(participantId)!;
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;

        if (imageType === 'full') {
          images.full = publicUrl;
        } else {
          images.circle = publicUrl;
        }
      } else {
        if (debugCount < 10) {
          console.log('');
        }
      }

      if (debugCount < 10) {
        debugCount++;
      }
    });

    console.log('');

    console.log(`📊 2. 이미지 그룹화 완료:`);
    console.log(`   ${imageMap.size}명의 참가자 이미지\n`);

    // 3. Firestore 참가자 문서 업데이트
    console.log('📝 3. Firestore 업데이트 중...\n');

    let successCount = 0;
    let missingCount = 0;
    const missingParticipants: string[] = [];

    for (const [participantId, images] of imageMap.entries()) {
      const participantRef = db.collection('participants').doc(participantId);
      const participantSnap = await participantRef.get();

      if (!participantSnap.exists) {
        console.log(`⚠️  참가자 없음: ${participantId}`);
        missingCount++;
        missingParticipants.push(participantId);
        continue;
      }

      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (images.full) {
        updateData.profileImage = images.full;
      }

      if (images.circle) {
        updateData.profileImageCircle = images.circle;
      }

      await participantRef.update(updateData);

      const participantData = participantSnap.data();
      console.log(`✅ ${participantData?.name || participantId}`);
      console.log(`   Full: ${images.full ? '✅' : '❌'}`);
      console.log(`   Circle: ${images.circle ? '✅' : '❌'}`);
      console.log('');

      successCount++;
    }

    // 4. 결과 요약
    console.log('\n📊 4. 업데이트 결과:');
    console.log('==================');
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`⚠️  참가자 없음: ${missingCount}명`);

    if (missingParticipants.length > 0) {
      console.log(`\n누락된 참가자 ID:`);
      missingParticipants.forEach(id => console.log(`  - ${id}`));
    }

    // 5. 이미지 없는 참가자 확인
    console.log('\n🔍 5. 이미지 없는 참가자 확인...');
    const allParticipantsSnap = await db
      .collection('participants')
      .where('cohortId', '==', COHORT_ID)
      .get();

    const participantsWithoutImages: string[] = [];

    allParticipantsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.profileImage || !data.profileImageCircle) {
        participantsWithoutImages.push(`${data.name} (${doc.id})`);
      }
    });

    if (participantsWithoutImages.length > 0) {
      console.log(`⚠️  이미지 없는 참가자 ${participantsWithoutImages.length}명:`);
      participantsWithoutImages.forEach(name => console.log(`  - ${name}`));
    } else {
      console.log('✅ 모든 참가자에게 이미지가 연결되었습니다!');
    }

    console.log('\n🎉 프로필 이미지 업데이트 완료!');
  } catch (error) {
    console.error('\n❌ 에러 발생:', error);
    throw error;
  }
}

updateProfileImages();
