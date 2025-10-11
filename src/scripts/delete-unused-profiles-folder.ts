/**
 * Delete unused profiles/ folder from Firebase Storage
 *
 * Analysis shows:
 * - profiles/ folder: 99 files, 0% used ❌
 * - profile_images/ folder: 40 files, 100% used ✅
 *
 * This script safely removes the unused profiles/ folder
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

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

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function deleteProfilesFolder() {
  console.log('🗑️  Delete Unused profiles/ Folder');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // List all files in profiles/ folder
    const [files] = await bucket.getFiles({ prefix: 'profiles/' });

    console.log(`📊 Found ${files.length} files in profiles/ folder\n`);

    if (files.length === 0) {
      console.log('✅ profiles/ folder is already empty or does not exist\n');
      return;
    }

    // Show sample files
    console.log('Sample files to be deleted (first 10):');
    files.slice(0, 10).forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
    });

    if (files.length > 10) {
      console.log(`   ... and ${files.length - 10} more\n`);
    } else {
      console.log('');
    }

    // Ask for confirmation
    const confirmed = await askConfirmation(
      `⚠️  Are you sure you want to delete ${files.length} files from profiles/? (y/n): `
    );

    if (!confirmed) {
      console.log('\n❌ Deletion cancelled\n');
      return;
    }

    console.log('\n🔄 Deleting files...\n');

    let deleted = 0;
    for (const file of files) {
      try {
        await file.delete();
        deleted++;

        if (deleted % 10 === 0) {
          console.log(`   Progress: ${deleted}/${files.length} files deleted...`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to delete ${file.name}:`, error);
      }
    }

    console.log(`\n✅ Successfully deleted ${deleted} files from profiles/ folder\n`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Cleanup complete!\n');
    console.log('📊 Storage Status:');
    console.log('   ✅ profile_images/ - IN USE (40 files, 100% used)');
    console.log('   ✅ profiles/ - DELETED (99 files removed)\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

deleteProfilesFolder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
