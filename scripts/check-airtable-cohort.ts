/**
 * Airtable에서 특정 기수 현황 확인
 * 
 * 사용법: npx tsx scripts/check-airtable-cohort.ts 6
 */

import path from 'path';
import dotenv from 'dotenv';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

const AIRTABLE_FIELDS = {
    PHONE_NUMBER: '연락처',
    NAME: '이름',
    PAYMENT_STATUS: '결제 여부',
    MEMBERSHIP_COHORT: '멤버십 기수',
};

interface AirtableRecord {
    id: string;
    fields: {
        [key: string]: string | string[] | undefined;
    };
}

async function fetchAllRecords(cohortNumber: string): Promise<AirtableRecord[]> {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
        throw new Error('Airtable 환경 변수가 설정되지 않았습니다.');
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

    // 해당 기수가 포함된 모든 레코드 조회 (결제 여부 상관없이)
    const filterFormula = `FIND("${cohortNumber}", ARRAYJOIN({${AIRTABLE_FIELDS.MEMBERSHIP_COHORT}}, ",")) > 0`;

    const params = new URLSearchParams({
        filterByFormula: filterFormula,
    });

    const response = await fetch(`${url}?${params}`, {
        headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.records as AirtableRecord[];
}

async function checkAirtableCohort(cohortNumber: string) {
    console.log(`\n📊 Airtable ${cohortNumber}기 현황 확인\n`);
    console.log('='.repeat(60));

    const records = await fetchAllRecords(cohortNumber);
    console.log(`\n📌 ${cohortNumber}기 총 인원: ${records.length}명\n`);

    // 결제 상태별 분류
    const byPaymentStatus: Record<string, string[]> = {};

    records.forEach((record) => {
        const name = record.fields[AIRTABLE_FIELDS.NAME] as string || '이름 없음';
        const phone = record.fields[AIRTABLE_FIELDS.PHONE_NUMBER] as string || '';
        const paymentStatus = record.fields[AIRTABLE_FIELDS.PAYMENT_STATUS] as string || '미입력';
        const cohorts = record.fields[AIRTABLE_FIELDS.MEMBERSHIP_COHORT] as string[] || [];

        const displayName = `${name} (${phone.slice(-4)}) [기수: ${cohorts.join(', ')}]`;

        if (!byPaymentStatus[paymentStatus]) {
            byPaymentStatus[paymentStatus] = [];
        }
        byPaymentStatus[paymentStatus].push(displayName);
    });

    // 결과 출력
    console.log('📊 결제 상태별 분포:');
    console.log('-'.repeat(60));

    for (const [status, names] of Object.entries(byPaymentStatus)) {
        const icon = status === '결제 완료' ? '✅' : status === '미입력' ? '❓' : '⏳';
        console.log(`\n${icon} ${status}: ${names.length}명`);
        names.forEach((name) => console.log(`   - ${name}`));
    }

    // 요약
    const paidCount = byPaymentStatus['결제 완료']?.length || 0;
    const unpaidCount = records.length - paidCount;

    console.log('\n' + '='.repeat(60));
    console.log('📋 요약:');
    console.log(`   - 전체: ${records.length}명`);
    console.log(`   - 결제 완료: ${paidCount}명`);
    console.log(`   - 미결제/미입력: ${unpaidCount}명`);
}

// 실행
const cohortNumber = process.argv[2] || '6';
checkAirtableCohort(cohortNumber)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ 오류:', error);
        process.exit(1);
    });
