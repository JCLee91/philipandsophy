/**
 * Convert all PNG images in image_update folder to lossless WebP
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = path.join(process.cwd(), 'public/image/image_update');

async function convertAllToWebP() {
  console.log('🔄 무손실 WebP 변환 시작\n');

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.png'));

  console.log(`📁 변환 대상: ${files.length}개 파일\n`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(INPUT_DIR, file.replace('.png', '.webp'));

    try {
      const inputMeta = await sharp(inputPath).metadata();

      await sharp(inputPath)
        .webp({
          lossless: true,      // 무손실 압축
          quality: 100,        // 최고 품질
          nearLossless: false  // 완전 무손실
        })
        .toFile(outputPath);

      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);

      console.log(`✅ ${file}`);
      console.log(`   원본: ${inputMeta.width}x${inputMeta.height}px (${(inputStats.size / 1024).toFixed(1)} KB)`);
      console.log(`   WebP: ${(outputStats.size / 1024).toFixed(1)} KB`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ ${file}: ${error.message}\n`);
    }
  }

  console.log('✅ 변환 완료!');
}

convertAllToWebP()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
