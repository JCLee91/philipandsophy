/**
 * 3기 Storage 파일 목록 확인
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage(app).bucket();

async function listStorageFiles() {
  console.log('📂 3기 Storage 파일 목록 확인...\n');

  try {
    // cohorts/cohort3/ 경로의 모든 파일
    const [files] = await bucket.getFiles({
      prefix: 'cohorts/cohort3/',
    });

    console.log(`총 ${files.length}개 파일\n`);
    console.log('==================\n');

    // 폴더별로 그룹화
    const byFolder = new Map<string, string[]>();

    files.forEach((file) => {
      const parts = file.name.split('/');
      const folder = parts.slice(0, -1).join('/'); // cohorts/cohort3/profiles
      const fileName = parts[parts.length - 1];

      if (!byFolder.has(folder)) {
        byFolder.set(folder, []);
      }

      byFolder.get(folder)!.push(fileName);
    });

    // 폴더별 출력
    Array.from(byFolder.entries()).forEach(([folder, fileNames]) => {
      console.log(`📁 ${folder}/`);
      console.log(`   파일 수: ${fileNames.length}개`);
      console.log('');

      // 처음 10개만 표시
      fileNames.slice(0, 10).forEach((fileName) => {
        console.log(`   - ${fileName}`);
      });

      if (fileNames.length > 10) {
        console.log(`   ... 외 ${fileNames.length - 10}개`);
      }

      console.log('');
    });

    // profiles 폴더 상세 분석
    const profilesFolder = 'cohorts/cohort3/profiles';
    if (byFolder.has(profilesFolder)) {
      console.log('\n🔍 profiles 폴더 상세 분석:');
      console.log('==================\n');

      const profileFiles = byFolder.get(profilesFolder)!;

      // _full, _circle 구분
      const fullImages = profileFiles.filter(f => f.includes('_full'));
      const circleImages = profileFiles.filter(f => f.includes('_circle'));
      const others = profileFiles.filter(f => !f.includes('_full') && !f.includes('_circle'));

      console.log(`Full 이미지: ${fullImages.length}개`);
      console.log(`Circle 이미지: ${circleImages.length}개`);
      console.log(`기타 파일: ${others.length}개`);

      if (others.length > 0) {
        console.log('\n기타 파일 목록:');
        others.forEach(f => console.log(`  - ${f}`));
      }

      // 파일명 형식 체크
      console.log('\n📋 파일명 형식 예시 (처음 5개):');
      profileFiles.slice(0, 5).forEach((fileName) => {
        console.log(`  ${fileName}`);
      });
    }

    console.log('\n✅ 확인 완료');
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

listStorageFiles();
