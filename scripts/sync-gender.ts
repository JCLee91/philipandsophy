/**
 * 기존 참가자 성별 데이터 동기화
 * 
 * Airtable에서 성별 정보를 가져와 Firestore participants에 업데이트
 * 
 * 사용법:
 * - 미리보기: npx tsx scripts/sync-gender.ts --cohort=6
 * - 실행: npx tsx scripts/sync-gender.ts --cohort=6 --execute
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import path from 'path';
import dotenv from 'dotenv';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

// Firebase Admin 초기화
function initFirebaseAdmin() {
    if (getApps().length > 0) {
        return getFirestore();
    }
    const serviceAccountPath = path.resolve(
        process.cwd(),
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
    );
    initializeApp({ credential: cert(serviceAccountPath) });
    return getFirestore();
}

interface AirtableRecord {
    name: string;
    phone: string;
    gender: 'male' | 'female' | undefined;
}

interface FirestoreParticipant {
    id: string;
    name: string;
    phoneNumber: string;
    gender?: 'male' | 'female';
}

async function fetchFromAirtable(cohortNumber: string): Promise<AirtableRecord[]> {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    const filterFormula = `FIND("${cohortNumber}", ARRAYJOIN({멤버십 기수}, ",")) > 0`;

    const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) throw new Error(`Airtable API 오류: ${response.status}`);

    const data = await response.json();
    return data.records.map((r: any) => {
        const genderRaw = r.fields['성별'];
        const gender = genderRaw === '남' ? 'male' : genderRaw === '여' ? 'female' : undefined;
        return {
            name: r.fields['이름'] || '',
            phone: (r.fields['연락처'] || '').replace(/-/g, ''),
            gender,
        };
    });
}

async function main() {
    const args = process.argv.slice(2);
    const cohortArg = args.find((a) => a.startsWith('--cohort='));
    const cohortId = cohortArg ? cohortArg.replace('--cohort=', '') : '6';
    const execute = args.includes('--execute');

    const db = initFirebaseAdmin();

    console.log('\n🔄 기존 참가자 성별 데이터 동기화\n');
    console.log('='.repeat(60));
    console.log(`대상 기수: ${cohortId}기`);
    console.log(`모드: ${execute ? '🔴 실제 실행' : '🟡 Dry-run (미리보기)'}`);
    console.log();

    // 1. Airtable에서 해당 기수 데이터 조회
    console.log('📡 Airtable에서 데이터 조회 중...');
    const airtableRecords = await fetchFromAirtable(cohortId);
    console.log(`   └─ ${airtableRecords.length}명 조회됨`);

    // 전화번호 → gender 맵 생성
    const phoneToGender = new Map<string, 'male' | 'female'>();
    airtableRecords.forEach((r) => {
        if (r.gender) {
            phoneToGender.set(r.phone, r.gender);
        }
    });

    // 2. Firestore에서 해당 기수 참가자 조회
    console.log('\n📦 Firestore에서 참가자 조회 중...');
    const snapshot = await db.collection('participants').where('cohortId', '==', cohortId).get();
    console.log(`   └─ ${snapshot.size}명 조회됨`);

    // 3. 성별 누락된 참가자 찾기
    const toUpdate: { id: string; name: string; phone: string; newGender: 'male' | 'female' }[] = [];

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.isSuperAdmin || data.isAdministrator || data.isGhost) return;

        const phone = data.phoneNumber?.replace(/-/g, '') || '';
        const currentGender = data.gender;
        const airtableGender = phoneToGender.get(phone);

        // 성별이 없거나 다른 경우
        if (!currentGender && airtableGender) {
            toUpdate.push({
                id: doc.id,
                name: data.name || '',
                phone,
                newGender: airtableGender,
            });
        }
    });

    console.log(`\n⚠️  성별 업데이트 필요: ${toUpdate.length}명\n`);

    if (toUpdate.length === 0) {
        console.log('✅ 모든 참가자의 성별 데이터가 이미 있습니다.');
        return;
    }

    // 결과 출력
    console.log('업데이트 대상:');
    console.log('-'.repeat(60));
    toUpdate.forEach((p, i) => {
        const genderLabel = p.newGender === 'male' ? '남성' : '여성';
        console.log(`  ${i + 1}. ${p.name} (${p.phone.slice(-4)}) → ${genderLabel}`);
    });

    if (!execute) {
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  Dry-run 모드입니다. 실제 업데이트하려면 --execute 플래그를 추가하세요:');
        console.log(`    npx tsx scripts/sync-gender.ts --cohort=${cohortId} --execute`);
        return;
    }

    // 4. 실제 업데이트
    console.log('\n🔄 Firestore 업데이트 중...');
    const batch = db.batch();

    toUpdate.forEach((p) => {
        const ref = db.collection('participants').doc(p.id);
        batch.update(ref, {
            gender: p.newGender,
            updatedAt: Timestamp.now(),
        });
    });

    await batch.commit();

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 완료! ${toUpdate.length}명의 성별 데이터가 업데이트되었습니다.`);
}

main().catch((err) => {
    console.error('❌ 오류:', err);
    process.exit(1);
});
