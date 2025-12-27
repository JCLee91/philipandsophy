/**
 * 특정 코호트의 참가자 status 분포 확인
 * 
 * 사용법: npx tsx scripts/check-cohort-status.ts 6
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import dotenv from 'dotenv';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase Admin 초기화
function initFirebaseAdmin() {
    if (getApps().length > 0) {
        return getFirestore();
    }

    const serviceAccountPath = path.resolve(
        process.cwd(),
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
    );

    initializeApp({
        credential: cert(serviceAccountPath),
    });

    return getFirestore();
}

const db = initFirebaseAdmin();

async function checkCohortStatus(cohortId: string) {
    console.log(`\n📊 코호트 ${cohortId} 참가자 status 분포 확인\n`);
    console.log('='.repeat(50));

    const snapshot = await db
        .collection('participants')
        .where('cohortId', '==', cohortId)
        .get();

    console.log(`\n📌 총 참가자 수 (DB 전체): ${snapshot.docs.length}명\n`);

    // Status별 분류
    const byStatus: Record<string, string[]> = {
        active: [],
        applicant: [],
        inactive: [],
        undefined: [], // status 필드 없음 (레거시)
    };

    // Admin/Ghost 분류
    const adminsAndGhosts: string[] = [];

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const name = data.name || doc.id;
        const status = data.status || 'undefined';

        if (data.isSuperAdmin || data.isAdministrator || data.isGhost) {
            adminsAndGhosts.push(`${name} (${data.isSuperAdmin ? 'superAdmin' : data.isAdministrator ? 'admin' : 'ghost'})`);
            return;
        }

        if (status in byStatus) {
            byStatus[status].push(name);
        } else {
            byStatus[status] = [name];
        }
    });

    // 결과 출력
    console.log('📊 Status 분포:');
    console.log('-'.repeat(50));

    for (const [status, names] of Object.entries(byStatus)) {
        if (names.length > 0) {
            const statusIcon = status === 'active' ? '✅' : status === 'applicant' ? '⏳' : status === 'inactive' ? '❌' : '❓';
            console.log(`\n${statusIcon} ${status}: ${names.length}명`);
            names.forEach((name) => console.log(`   - ${name}`));
        }
    }

    if (adminsAndGhosts.length > 0) {
        console.log(`\n👻 관리자/고스트 (제외): ${adminsAndGhosts.length}명`);
        adminsAndGhosts.forEach((name) => console.log(`   - ${name}`));
    }

    // 요약
    const activeCount = byStatus.active.length + byStatus.undefined.length; // undefined는 레거시로 active 취급
    const applicantCount = byStatus.applicant.length;
    const inactiveCount = byStatus.inactive.length;
    const excludedCount = adminsAndGhosts.length;

    console.log('\n' + '='.repeat(50));
    console.log('📋 요약:');
    console.log(`   - 데이터센터에 표시되는 수: ${activeCount}명 (active + 레거시)`);
    console.log(`   - 결제 대기 중 (applicant): ${applicantCount}명`);
    console.log(`   - 비활성화 (inactive): ${inactiveCount}명`);
    console.log(`   - 관리자/고스트 제외: ${excludedCount}명`);
    console.log(`   - DB 전체: ${snapshot.docs.length}명`);
}

// 실행
const cohortId = process.argv[2] || '6';
checkCohortStatus(cohortId)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ 오류:', error);
        process.exit(1);
    });
