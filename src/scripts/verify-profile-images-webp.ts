/**
 * Verify all profile images in profile_images/ are WebP format
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const storage = getStorage();
const bucket = storage.bucket();

async function verifyWebPFormat() {
  console.log('🔍 Verifying profile_images/ WebP Format');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const [files] = await bucket.getFiles({ prefix: 'profile_images/' });

    console.log(`📊 Total files: ${files.length}\n`);

    const webpFiles: string[] = [];
    const nonWebpFiles: string[] = [];

    files.forEach(file => {
      const fileName = file.name;
      if (fileName.endsWith('.webp')) {
        webpFiles.push(fileName);
      } else {
        nonWebpFiles.push(fileName);
      }
    });

    console.log('✅ WebP files:');
    console.log(`   Count: ${webpFiles.length} (${((webpFiles.length / files.length) * 100).toFixed(1)}%)\n`);

    if (webpFiles.length <= 10) {
      webpFiles.forEach(file => console.log(`   ✓ ${file}`));
    } else {
      webpFiles.slice(0, 10).forEach(file => console.log(`   ✓ ${file}`));
      console.log(`   ... and ${webpFiles.length - 10} more`);
    }

    console.log('\n❌ Non-WebP files:');
    console.log(`   Count: ${nonWebpFiles.length} (${((nonWebpFiles.length / files.length) * 100).toFixed(1)}%)\n`);

    if (nonWebpFiles.length > 0) {
      nonWebpFiles.forEach(file => console.log(`   ⚠️  ${file}`));
    } else {
      console.log('   (None - all files are WebP! ✨)');
    }

    console.log('\n═══════════════════════════════════════════════════════');

    if (nonWebpFiles.length === 0) {
      console.log('✅ All profile images are optimized WebP format!\n');
    } else {
      console.log(`⚠️  Found ${nonWebpFiles.length} non-WebP files that need conversion\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

verifyWebPFormat()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
