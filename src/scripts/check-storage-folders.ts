/**
 * Check all folders in Firebase Storage and list what profiles are being used
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
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
const db = getFirestore();

interface FolderStats {
  folderName: string;
  fileCount: number;
  files: string[];
}

async function getAllFolders(): Promise<FolderStats[]> {
  console.log('📁 Scanning Firebase Storage for all folders...\n');

  try {
    const [files] = await bucket.getFiles();

    // Group files by folder
    const folderMap = new Map<string, string[]>();

    files.forEach(file => {
      const parts = file.name.split('/');
      if (parts.length > 1) {
        const folder = parts[0];
        if (!folderMap.has(folder)) {
          folderMap.set(folder, []);
        }
        folderMap.get(folder)!.push(file.name);
      }
    });

    const folderStats: FolderStats[] = [];
    for (const [folder, fileList] of folderMap.entries()) {
      folderStats.push({
        folderName: folder,
        fileCount: fileList.length,
        files: fileList,
      });
    }

    return folderStats.sort((a, b) => b.fileCount - a.fileCount);
  } catch (error) {
    console.error('Error scanning storage:', error);
    return [];
  }
}

async function checkParticipantImages() {
  console.log('👤 Checking participant profile images in Firestore...\n');

  try {
    const participantsSnapshot = await db.collection('participants').get();

    const imageUrls = {
      profileImage: [] as string[],
      profileImageCircle: [] as string[],
    };

    participantsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.profileImage) {
        imageUrls.profileImage.push(data.profileImage);
      }
      if (data.profileImageCircle) {
        imageUrls.profileImageCircle.push(data.profileImageCircle);
      }
    });

    console.log(`Total participants: ${participantsSnapshot.size}`);
    console.log(`  - with profileImage: ${imageUrls.profileImage.length}`);
    console.log(`  - with profileImageCircle: ${imageUrls.profileImageCircle.length}\n`);

    // Extract storage paths from URLs
    const extractPath = (url: string): string => {
      // Extract path from Firebase Storage URL
      // Format: https://storage.googleapis.com/{bucket}/path/to/file
      const match = url.match(/googleapis\.com\/[^/]+\/(.+)$/);
      return match ? match[1] : url;
    };

    const usedPaths = new Set<string>();
    imageUrls.profileImage.forEach(url => usedPaths.add(extractPath(url)));
    imageUrls.profileImageCircle.forEach(url => usedPaths.add(extractPath(url)));

    return {
      totalParticipants: participantsSnapshot.size,
      profileImageCount: imageUrls.profileImage.length,
      profileImageCircleCount: imageUrls.profileImageCircle.length,
      usedPaths: Array.from(usedPaths),
    };
  } catch (error) {
    console.error('Error checking participants:', error);
    return null;
  }
}

async function analyzeStorageUsage() {
  console.log('🔍 Firebase Storage Analysis');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get all folders in storage
  const folders = await getAllFolders();

  console.log('📊 Storage Folders:\n');
  folders.forEach(folder => {
    console.log(`\n📁 ${folder.folderName}/ (${folder.fileCount} files)`);
    if (folder.fileCount <= 10) {
      folder.files.forEach(file => {
        console.log(`   - ${file}`);
      });
    } else {
      console.log(`   (showing first 10 files)`);
      folder.files.slice(0, 10).forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log(`   ... and ${folder.fileCount - 10} more`);
    }
  });

  console.log('\n═══════════════════════════════════════════════════════\n');

  // Check which profile images are actually used
  const participantData = await checkParticipantImages();

  if (participantData) {
    console.log('📋 Profile Images in Use:\n');
    console.log(`Sample used paths (first 10):`);
    participantData.usedPaths.slice(0, 10).forEach(path => {
      console.log(`   ✅ ${path}`);
    });

    // Find which folders are actually used
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🎯 Folder Usage Analysis:\n');

    folders.forEach(folder => {
      const usedInFolder = participantData.usedPaths.filter(path =>
        path.startsWith(folder.folderName + '/')
      ).length;

      const usagePercent = folder.fileCount > 0
        ? ((usedInFolder / folder.fileCount) * 100).toFixed(1)
        : '0.0';

      const status = usedInFolder > 0 ? '✅ IN USE' : '❌ UNUSED';

      console.log(`${status} ${folder.folderName}/`);
      console.log(`   Files: ${folder.fileCount}`);
      console.log(`   Used: ${usedInFolder} (${usagePercent}%)`);
      console.log(`   Unused: ${folder.fileCount - usedInFolder}\n`);
    });
  }

  console.log('═══════════════════════════════════════════════════════');
}

analyzeStorageUsage()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
