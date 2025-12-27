/**
 * Airtable 결제 완료자 vs Firestore 상태 비교
 * 
 * 사용법: npx tsx scripts/compare-airtable-firestore.ts 6
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
    paymentStatus: string;
}

interface FirestoreParticipant {
    id: string;
    name: string;
    phoneNumber: string;
    status: string;
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
        paymentStatus: r.fields['결제 여부'] || '',
    }));
}

async function fetchFirestoreParticipants(db: FirebaseFirestore.Firestore, cohortId: string): Promise<FirestoreParticipant[]> {
    const snapshot = await db.collection('participants').where('cohortId', '==', cohortId).get();

    return snapshot.docs
        .filter(doc => {
            const d = doc.data();
            return !d.isSuperAdmin && !d.isAdministrator && !d.isGhost;
        })
        .map(doc => ({
            id: doc.id,
            name: doc.data().name || '',
            phoneNumber: (doc.data().phoneNumber || '').replace(/-/g, ''),
            status: doc.data().status || 'undefined',
        }));
}

async function compare(cohortNumber: string) {
    const db = initFirebaseAdmin();

    console.log(`\n🔍 Airtable vs Firestore 비교 (${cohortNumber}기)\n`);
    console.log('='.repeat(70));

    // 1. Airtable 결제 완료자
    const airtablePaid = await fetchPaidFromAirtable(cohortNumber);
    console.log(`\n📡 Airtable 결제 완료: ${airtablePaid.length}명`);

    // 2. Firestore 참가자
    const firestoreParticipants = await fetchFirestoreParticipants(db, cohortNumber);
    console.log(`📦 Firestore 전체: ${firestoreParticipants.length}명`);
    console.log(`   - active: ${firestoreParticipants.filter(p => p.status === 'active').length}명`);
    console.log(`   - applicant: ${firestoreParticipants.filter(p => p.status === 'applicant').length}명`);

    // 3. 비교: Airtable 결제 완료인데 Firestore에서 active가 아닌 사람
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  Airtable 결제 완료인데 Firestore에서 active 아닌 사람:');
    console.log('-'.repeat(70));

    const issues: { airtable: AirtableRecord; firestore: FirestoreParticipant | null }[] = [];

    for (const atr of airtablePaid) {
        const fs = firestoreParticipants.find(p => p.phoneNumber === atr.phone);

        if (!fs) {
            console.log(`❌ ${atr.name} (${atr.phone.slice(-4)}) - Firestore에 없음!`);
            issues.push({ airtable: atr, firestore: null });
        } else if (fs.status !== 'active') {
            console.log(`⏳ ${atr.name} (${atr.phone.slice(-4)}) - Firestore status: "${fs.status}" (ID: ${fs.id})`);
            issues.push({ airtable: atr, firestore: fs });
        }
    }

    if (issues.length === 0) {
        console.log('✅ 모든 결제 완료자가 Firestore에서 active 상태입니다!');
    } else {
        console.log(`\n⚠️  총 ${issues.length}명이 동기화 필요`);
    }

    // 4. 반대로: Firestore에서 active인데 Airtable 결제 완료가 아닌 사람
    console.log('\n' + '='.repeat(70));
    console.log('🔄 Firestore active인데 Airtable 결제완료 목록에 없는 사람:');
    console.log('-'.repeat(70));

    const activeInFirestore = firestoreParticipants.filter(p => p.status === 'active');
    let orphanCount = 0;

    for (const fs of activeInFirestore) {
        const atr = airtablePaid.find(a => a.phone === fs.phoneNumber);
        if (!atr) {
            console.log(`🔸 ${fs.name} (${fs.phoneNumber.slice(-4)}) - ID: ${fs.id}`);
            orphanCount++;
        }
    }

    if (orphanCount === 0) {
        console.log('✅ 모든 Firestore active 참가자가 Airtable에서도 결제 완료 상태입니다.');
    }
}

const cohortNumber = process.argv[2] || '6';
compare(cohortNumber)
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ 오류:', err);
        process.exit(1);
    });
