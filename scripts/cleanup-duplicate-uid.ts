/**
 * UID 중복 정리 스크립트
 *
 * 목적: 동일 firebaseUid를 가진 participant 문서 정리
 * - 최신 문서(createdAt 기준) 1개만 UID 유지
 * - 나머지 문서의 firebaseUid를 null로 변경
 *
 * 실행:
 * npx tsx scripts/cleanup-duplicate-uid.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(admin.app());

async function cleanupDuplicateUid(dryRun = true): Promise<void> {
  console.log(`\n🔍 UID 중복 검사 ${dryRun ? '(DRY RUN - 변경 없음)' : '(실제 정리 수행)'}\n`);

  const participantsSnapshot = await db
    .collection('participants')
    .where('firebaseUid', '!=', null)
    .get();

  console.log(`총 ${participantsSnapshot.size}개 participant 문서 (firebaseUid 있음)\n`);

  // UID별로 그룹화
  const uidMap = new Map<string, any[]>();

  participantsSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    const uid = data.firebaseUid;

    if (!uidMap.has(uid)) {
      uidMap.set(uid, []);
    }

    uidMap.get(uid)!.push({
      docId: doc.id,
      data,
      doc,
    });
  });

  // 중복 UID 찾기
  const duplicates = Array.from(uidMap.entries()).filter(([_, docs]) => docs.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ UID 중복 없음 - 모든 데이터 정상\n');
    return;
  }

  console.log(`⚠️  ${duplicates.length}개의 중복 UID 발견:\n`);
  console.log('─'.repeat(100));

  let totalAffected = 0;

  for (const [uid, docs] of duplicates) {
    // createdAt 기준 정렬 (최신 우선)
    docs.sort((a, b) => {
      const aTime = a.data.createdAt?.toMillis() || 0;
      const bTime = b.data.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });

    const keep = docs[0];
    const cleanup = docs.slice(1);

    console.log(`\nUID: ${uid.substring(0, 20)}...`);
    console.log(`  ✅ 유지: ${keep.docId} (${keep.data.name}, cohort: ${keep.data.cohortId})`);

    cleanup.forEach(doc => {
      console.log(`  ❌ 정리: ${doc.docId} (${doc.data.name}, cohort: ${doc.data.cohortId})`);
      totalAffected++;
    });

    // 실제 정리 수행
    if (!dryRun) {
      for (const doc of cleanup) {
        await db.collection('participants').doc(doc.docId).update({
          firebaseUid: null,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`    → UID 제거 완료: ${doc.docId}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(100));
  console.log(`\n📊 요약:`);
  console.log(`   중복 UID: ${duplicates.length}개`);
  console.log(`   정리 대상: ${totalAffected}개 문서`);

  if (dryRun) {
    console.log(`\n💡 실제 정리하려면: npx tsx scripts/cleanup-duplicate-uid.ts --apply\n`);
  } else {
    console.log(`\n✅ UID 중복 정리 완료!\n`);
  }
}

async function main() {
  try {
    const dryRun = !process.argv.includes('--apply');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Firebase UID Duplicate Cleanup                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    await cleanupDuplicateUid(dryRun);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
