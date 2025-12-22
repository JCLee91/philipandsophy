import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ firebase-service-account.json not found at:', serviceAccountPath);
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://philipandsophy-default-rtdb.asia-southeast1.firebasedatabase.app'
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to read service account JSON:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

interface SchemaStats {
  totalDocuments: number;
  v1Documents: number; // similar/opposite 필드 포함
  v2Documents: number; // assigned 필드만 포함
  mixedDocuments: number; // 둘 다 포함
  emptyDocuments: number;
  sampleDates: string[];
}

async function auditFirestoreSchema() {
  console.log('\n📊 Firestore 스키마 감사 시작');
  console.log('=' + '='.repeat(60));

  try {
    // 1. cohorts 컬렉션 확인
    console.log('\n1️⃣ cohorts 컬렉션 확인');
    const cohortsSnapshot = await db.collection('cohorts').get();
    console.log(`   총 코호트 수: ${cohortsSnapshot.size}`);

    // 2. dailyFeaturedParticipants 서브컬렉션 감사
    for (const cohortDoc of cohortsSnapshot.docs) {
      console.log(`\n2️⃣ 코호트: ${cohortDoc.id}`);
      console.log('   ' + '-'.repeat(55));

      const dailyDocs = await cohortDoc.ref
        .collection('dailyFeaturedParticipants')
        .orderBy('date', 'desc')
        .limit(30) // 최근 30일만
        .get();

      console.log(`   dailyFeaturedParticipants 문서 수: ${dailyDocs.size}`);

      const stats: SchemaStats = {
        totalDocuments: dailyDocs.size,
        v1Documents: 0,
        v2Documents: 0,
        mixedDocuments: 0,
        emptyDocuments: 0,
        sampleDates: []
      };

      // 각 날짜별 문서 분석
      for (const dailyDoc of dailyDocs.docs) {
        const data = dailyDoc.data();
        const date = dailyDoc.id;

        if (!data.assignments) {
          stats.emptyDocuments++;
          continue;
        }

        const participantIds = Object.keys(data.assignments);
        let hasV1 = false;
        let hasV2 = false;

        // 참가자별 필드 확인
        for (const participantId of participantIds) {
          const assignment = data.assignments[participantId];

          if (assignment.similar || assignment.opposite || assignment.reasons) {
            hasV1 = true;
          }

          if (assignment.assigned) {
            hasV2 = true;
          }
        }

        // 분류
        if (hasV1 && hasV2) {
          stats.mixedDocuments++;
        } else if (hasV1) {
          stats.v1Documents++;
        } else if (hasV2) {
          stats.v2Documents++;
        }

        // 샘플 날짜 저장 (처음 5개)
        if (stats.sampleDates.length < 5) {
          stats.sampleDates.push(date);
        }
      }

      // 통계 출력
      console.log('\n   📈 스키마 버전 분포:');
      console.log(`      - v1.0 전용 (similar/opposite): ${stats.v1Documents}개 (${((stats.v1Documents / stats.totalDocuments) * 100).toFixed(1)}%)`);
      console.log(`      - v2.0 전용 (assigned): ${stats.v2Documents}개 (${((stats.v2Documents / stats.totalDocuments) * 100).toFixed(1)}%)`);
      console.log(`      - 혼합 (v1 + v2): ${stats.mixedDocuments}개 (${((stats.mixedDocuments / stats.totalDocuments) * 100).toFixed(1)}%)`);
      console.log(`      - 비어있음: ${stats.emptyDocuments}개`);

      // 샘플 데이터 상세 확인
      if (stats.sampleDates.length > 0) {
        console.log('\n   🔍 샘플 데이터 상세 (최근 3건):');

        for (const sampleDate of stats.sampleDates.slice(0, 3)) {
          const sampleDoc = await cohortDoc.ref
            .collection('dailyFeaturedParticipants')
            .doc(sampleDate)
            .get();

          const sampleData = sampleDoc.data();
          if (!sampleData || !sampleData.assignments) continue;

          const firstParticipantId = Object.keys(sampleData.assignments)[0];
          const firstAssignment = sampleData.assignments[firstParticipantId];

          console.log(`\n      날짜: ${sampleDate}`);
          console.log(`      참가자 수: ${Object.keys(sampleData.assignments).length}`);
          console.log(`      첫 번째 참가자 (${firstParticipantId.substring(0, 20)}...):`);

          if (firstAssignment.similar) {
            console.log(`         - similar: [${firstAssignment.similar.length}개]`);
          }
          if (firstAssignment.opposite) {
            console.log(`         - opposite: [${firstAssignment.opposite.length}개]`);
          }
          if (firstAssignment.assigned) {
            console.log(`         - assigned: [${firstAssignment.assigned.length}개] ${firstAssignment.assigned.slice(0, 3).join(', ')}...`);
          }
          if (firstAssignment.reasons) {
            console.log(`         - reasons: { similar: "${firstAssignment.reasons.similar?.substring(0, 30)}...", opposite: "..." }`);
          }
          if (firstAssignment.isAdmin !== undefined) {
            console.log(`         - isAdmin: ${firstAssignment.isAdmin}`);
          }

          // matchingVersion 확인
          if (sampleData.matchingVersion) {
            console.log(`      매칭 방식: ${sampleData.matchingVersion}`);
          }
        }
      }

      // 마이그레이션 필요 여부 판단
      console.log('\n   🎯 조치 필요 사항:');
      if (stats.v1Documents > 0) {
        console.log(`      ⚠️  ${stats.v1Documents}개 문서를 v2.0으로 마이그레이션 필요`);
      }
      if (stats.mixedDocuments > 0) {
        console.log(`      ⚠️  ${stats.mixedDocuments}개 문서의 v1.0 필드 제거 필요`);
      }
      if (stats.v2Documents === stats.totalDocuments) {
        console.log(`      ✅ 모든 문서가 v2.0 형식 (조치 불필요)`);
      }
    }

    // 3. matching_previews 컬렉션 확인 (존재 시)
    console.log('\n\n3️⃣ matching_previews 컬렉션 확인');
    console.log('   ' + '-'.repeat(55));

    try {
      const previewsSnapshot = await db.collection('matching_previews')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      if (previewsSnapshot.empty) {
        console.log('   ℹ️  matching_previews 컬렉션이 비어있거나 존재하지 않습니다.');
      } else {
        console.log(`   총 미리보기 문서 수: ${previewsSnapshot.size} (최근 10개만 조회)`);

        // 첫 번째 문서 샘플
        const firstPreview = previewsSnapshot.docs[0];
        const previewData = firstPreview.data();

        console.log(`\n   샘플 문서 (${firstPreview.id}):`);
        console.log(`      - 생성일: ${previewData.createdAt?.toDate()?.toLocaleString('ko-KR')}`);
        console.log(`      - cohortId: ${previewData.cohortId}`);
        console.log(`      - 날짜: ${previewData.date}`);

        if (previewData.matching?.assignments) {
          const assignmentKeys = Object.keys(previewData.matching.assignments);
          const firstKey = assignmentKeys[0];
          const firstAssignment = previewData.matching.assignments[firstKey];

          console.log(`      - 참가자 수: ${assignmentKeys.length}`);
          console.log(`      - 구조: {`);
          console.log(`          similar: ${firstAssignment.similar ? `[${firstAssignment.similar.length}개]` : 'undefined'},`);
          console.log(`          opposite: ${firstAssignment.opposite ? `[${firstAssignment.opposite.length}개]` : 'undefined'},`);
          console.log(`          assigned: ${firstAssignment.assigned ? `[${firstAssignment.assigned.length}개]` : 'undefined'}`);
          console.log(`        }`);
        }

        if (previewData.matching?.matchingVersion) {
          console.log(`      - matchingVersion: ${previewData.matching.matchingVersion}`);
        }

        console.log('\n   🎯 조치 필요:');
        console.log('      ⚠️  manualMatchingPreview 함수가 이 컬렉션에 쓸 때');
        console.log('         v2.0 형식(assigned)을 사용하도록 수정 필요');
      }
    } catch (error: any) {
      if (error.code === 9) { // FAILED_PRECONDITION (인덱스 없음)
        console.log('   ℹ️  matching_previews 컬렉션이 존재하지 않거나 인덱스가 필요합니다.');
      } else {
        console.error('   ❌ 조회 실패:', error.message);
      }
    }

    // 4. 환경변수 확인
    console.log('\n\n4️⃣ 환경변수 확인');
    console.log('   ' + '-'.repeat(55));
    console.log(`   AI_PROVIDER: ${process.env.AI_PROVIDER || '(설정 안됨)'}`);
    console.log(`   AI_MODEL: ${process.env.AI_MODEL || '(설정 안됨)'}`);
    console.log(`   INTERNAL_SERVICE_SECRET: ${process.env.INTERNAL_SERVICE_SECRET ? '✅ 설정됨' : '❌ 설정 안됨'}`);

  } catch (error) {
    console.error('\n❌ 감사 실패:', error);
  }
}

// 스크립트 실행
auditFirestoreSchema()
  .then(() => {
    console.log('\n\n✅ 감사 완료');
    console.log('=' + '='.repeat(60));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 스크립트 오류:', error);
    process.exit(1);
  });
