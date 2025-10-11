/**
 * Verify WebP Conversion Success
 * 
 * Checks:
 * 1. Storage files are in WebP format
 * 2. Firestore records have WebP URLs
 * 3. No PNG files remain
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();

async function verifyConversion() {
  console.log('🔍 WebP Conversion Verification');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Check Storage files
  console.log('📁 Checking Firebase Storage files...\n');
  const [files] = await bucket.getFiles({ prefix: 'profile_images/' });
  
  const webpFiles = files.filter(f => f.name.endsWith('.webp'));
  const pngFiles = files.filter(f => f.name.endsWith('.png'));
  
  console.log(`   WebP files: ${webpFiles.length}`);
  console.log(`   PNG files: ${pngFiles.length}\n`);
  
  if (pngFiles.length > 0) {
    console.log('   ⚠️  PNG files still exist:');
    pngFiles.slice(0, 5).forEach(f => console.log(`      - ${f.name}`));
    if (pngFiles.length > 5) console.log(`      ... and ${pngFiles.length - 5} more`);
    console.log('');
  }

  // 2. Check Firestore records
  console.log('📊 Checking Firestore participant records...\n');
  const snapshot = await db.collection('participants').get();
  
  let webpCount = 0;
  let pngCount = 0;
  let noImageCount = 0;
  const sampleParticipants: any[] = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const hasImage = data.profileImage || data.profileImageCircle;
    
    if (hasImage) {
      const fullIsWebP = data.profileImage?.includes('.webp') || false;
      const circleIsWebP = data.profileImageCircle?.includes('.webp') || false;
      const fullIsPng = data.profileImage?.includes('.png') || false;
      const circleIsPng = data.profileImageCircle?.includes('.png') || false;

      if (fullIsWebP || circleIsWebP) webpCount++;
      if (fullIsPng || circleIsPng) pngCount++;

      if (sampleParticipants.length < 5) {
        sampleParticipants.push({
          id: doc.id,
          fullImage: data.profileImage || 'NONE',
          circleImage: data.profileImageCircle || 'NONE'
        });
      }
    } else {
      noImageCount++;
    }
  });

  console.log(`   Total participants: ${snapshot.size}`);
  console.log(`   With WebP images: ${webpCount}`);
  console.log(`   With PNG images: ${pngCount}`);
  console.log(`   Without images: ${noImageCount}\n`);

  // 3. Show sample URLs
  console.log('📷 Sample image URLs:\n');
  sampleParticipants.forEach(p => {
    console.log(`   ${p.id}:`);
    const fullExt = p.fullImage.includes('.webp') ? '✅ WebP' : 
                    p.fullImage.includes('.png') ? '❌ PNG' : 
                    p.fullImage === 'NONE' ? '⚠️  None' : '❓ Unknown';
    const circleExt = p.circleImage.includes('.webp') ? '✅ WebP' : 
                      p.circleImage.includes('.png') ? '❌ PNG' :
                      p.circleImage === 'NONE' ? '⚠️  None' : '❓ Unknown';
    
    console.log(`      Full: ${fullExt}`);
    console.log(`      Circle: ${circleExt}`);
    console.log('');
  });

  // 4. Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log('═══════════════════════════════════════════════════════');
  
  if (pngFiles.length === 0 && pngCount === 0 && webpCount > 0) {
    console.log('✅ WebP conversion successful!');
    console.log(`   - ${webpFiles.length} WebP files in Storage`);
    console.log(`   - ${webpCount} participants using WebP`);
    console.log(`   - 0 PNG files remaining`);
  } else if (pngFiles.length > 0 || pngCount > 0) {
    console.log('⚠️  Conversion incomplete:');
    console.log(`   - ${pngFiles.length} PNG files still in Storage`);
    console.log(`   - ${pngCount} participants still using PNG`);
  } else {
    console.log('ℹ️  No images found');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

verifyConversion()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
