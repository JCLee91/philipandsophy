/**
 * 재신청자 6기 participants 문서 생성
 * 
 * Airtable 6기 결제완료자 중 Firestore에 6기 문서가 없는 재신청자들을 위해
 * cohort6-{이름} 형태로 새 문서를 생성합니다.
 * 
 * 사용법:
 * - 미리보기: npx tsx scripts/create-reapplicant-documents.ts
 * - 실행: npx tsx scripts/create-reapplicant-documents.ts --execute
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
    gender?: 'male' | 'female';
}

async function fetchPaidFromAirtable(cohortNumber: string): Promise<AirtableRecord[]> {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    const filterFormula = `AND({결제 여부} = "결제 완료", FIND("${cohortNumber}", ARRAYJOIN({멤버십 기수}, ",")) > 0)`;

    const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) throw new Error(`Airtable API 오류: ${response.status}`);

    const data = await response.json();
    return data.records.map((r: any) => ({
        name: r.fields['이름'] || '',
        phone: (r.fields['연락처'] || '').replace(/-/g, ''),
        gender: r.fields['성별'] === '남' ? 'male' : r.fields['성별'] === '여' ? 'female' : undefined,
    }));
}

// 이름에서 성 제외
function getGivenName(fullName: string): string {
    if (fullName.length === 2) {
        return fullName.substring(1);
    } else if (fullName.length >= 3) {
        return fullName.substring(1);
    }
    return fullName;
}

async function main() {
    const execute = process.argv.includes('--execute');
    const cohortId = '6';
    const db = initFirebaseAdmin();

    console.log('\n🔄 재신청자 6기 participants 문서 생성\n');
    console.log('='.repeat(60));
    console.log(`모드: ${execute ? '🔴 실제 실행' : '🟡 Dry-run (미리보기)'}`);
    console.log();

    // 1. Airtable 6기 결제완료자 조회
    const airtablePaid = await fetchPaidFromAirtable(cohortId);
    console.log(`📡 Airtable 6기 결제 완료: ${airtablePaid.length}명`);

    // 2. Firestore 6기 참가자 조회
    const snapshot = await db.collection('participants').where('cohortId', '==', cohortId).get();
    const existingPhones = new Set(snapshot.docs.map(d => d.data().phoneNumber?.replace(/-/g, '')));
    console.log(`📦 Firestore 6기 기존: ${snapshot.size}명`);

    // 3. 누락된 재신청자 찾기
    const missing = airtablePaid.filter(a => !existingPhones.has(a.phone));
    console.log(`\n⚠️  Firestore에 6기 문서가 없는 재신청자: ${missing.length}명\n`);

    if (missing.length === 0) {
        console.log('✅ 모든 결제 완료자가 Firestore에 존재합니다.');
        return;
    }

    // 기존 참가자 정보 조회 (firebaseUid 등 복사용)
    for (const person of missing) {
        // 해당 전화번호로 기존 문서 찾기
        const existingDocs = await db.collection('participants')
            .where('phoneNumber', '==', person.phone)
            .limit(1)
            .get();

        const existingData = existingDocs.empty ? null : existingDocs.docs[0].data();
        const givenName = getGivenName(person.name);
        const newDocId = `cohort${cohortId}-${givenName}`;

        console.log(`📝 ${person.name} (${person.phone.slice(-4)})`);
        console.log(`   새 문서 ID: ${newDocId}`);
        if (existingData) {
            console.log(`   기존 문서에서 복사: ${existingDocs.docs[0].id}`);
            console.log(`   - firebaseUid: ${existingData.firebaseUid ? '있음' : '없음'}`);
        }

        if (execute) {
            const newData: any = {
                cohortId,
                name: person.name,
                phoneNumber: person.phone,
                status: 'active',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };

            // 기존 문서에서 firebaseUid, gender 등 복사
            if (existingData) {
                if (existingData.firebaseUid) newData.firebaseUid = existingData.firebaseUid;
                if (existingData.gender) newData.gender = existingData.gender;
                if (existingData.profileImage) newData.profileImage = existingData.profileImage;
                if (existingData.profileImageCircle) newData.profileImageCircle = existingData.profileImageCircle;
                if (existingData.occupation) newData.occupation = existingData.occupation;
                if (existingData.bio) newData.bio = existingData.bio;
            } else if (person.gender) {
                newData.gender = person.gender;
            }

            await db.collection('participants').doc(newDocId).set(newData);
            console.log(`   ✅ 생성 완료!`);
        }
        console.log();
    }

    if (!execute) {
        console.log('='.repeat(60));
        console.log('⚠️  Dry-run 모드입니다. 실제 생성하려면 --execute 플래그를 추가하세요:');
        console.log('    npx tsx scripts/create-reapplicant-documents.ts --execute');
    } else {
        console.log('='.repeat(60));
        console.log(`✅ 완료! ${missing.length}명의 6기 문서가 생성되었습니다.`);
    }
}

main().catch(err => {
    console.error('❌ 오류:', err);
    process.exit(1);
});
