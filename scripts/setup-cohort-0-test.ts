
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { subDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function setupCohort0() {
    console.log('🚀 Setting up Cohort 0 for testing...');

    // 1. Create/Update Cohort 0
    const cohortRef = db.collection('cohorts').doc('0');
    await cohortRef.set({
        id: '0',
        name: 'Test Cohort 0',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        isActive: true,
        useClusterMatching: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log('✅ Cohort 0 configured.');

    // 2. Create Dummy Participants
    const participants = [];
    for (let i = 1; i <= 10; i++) {
        const id = `test-user-${String(i).padStart(2, '0')}`;
        participants.push({
            id,
            name: `테스트유저${i}`,
            cohortId: '0',
            email: `test${i}@example.com`,
            gender: i <= 5 ? 'male' : 'female',
            isGhost: false,
            isSuperAdmin: false,
            isAdministrator: false,
            createdAt: Timestamp.now(),
        });
    }

    const batch = db.batch();
    participants.forEach(p => {
        const ref = db.collection('participants').doc(p.id);
        batch.set(ref, p, { merge: true });
    });
    await batch.commit();
    console.log('✅ 10 Dummy participants created.');

    // 3. Create Dummy Submissions for "Yesterday"
    const now = new Date();
    const kstNow = toZonedTime(now, 'Asia/Seoul');
    const yesterday = subDays(kstNow, 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    console.log(`📅 Creating submissions for date: ${yesterdayStr}`);

    const submissionsBatch = db.batch();

    // Group A (1-5): Emotional/Sentimental
    for (let i = 1; i <= 5; i++) {
        const id = `test-user-${String(i).padStart(2, '0')}`;
        const submissionId = `${id}-${yesterdayStr}`;
        const ref = db.collection('reading_submissions').doc(submissionId);

        submissionsBatch.set(ref, {
            id: submissionId,
            participantId: id,
            cohortId: '0',
            bookTitle: '감정의 안쪽',
            bookAuthor: '김감정',
            review: '오늘은 정말 마음이 울적하기도 하고 기쁘기도 한 이상한 날이었다. 책을 읽으며 내 내면의 깊은 곳을 들여다보게 되었다.',
            dailyQuestion: '오늘 당신의 감정은 어떤 색깔인가요?',
            dailyAnswer: '나의 감정은 깊은 파란색이다. 차분하면서도 어딘가 슬픈 느낌이 든다.',
            submissionDate: yesterdayStr,
            status: 'approved',
            submittedAt: Timestamp.now(),
        });
    }

    // Group B (6-10): Philosophical/Rational
    for (let i = 6; i <= 10; i++) {
        const id = `test-user-${String(i).padStart(2, '0')}`;
        const submissionId = `${id}-${yesterdayStr}`;
        const ref = db.collection('reading_submissions').doc(submissionId);

        submissionsBatch.set(ref, {
            id: submissionId,
            participantId: id,
            cohortId: '0',
            bookTitle: '철학의 위로',
            bookAuthor: '박철학',
            review: '인간의 존재 의의에 대해 고민하게 만드는 책이다. 우리는 왜 사는가? 죽음은 무엇인가? 끊임없는 질문이 꼬리를 문다.',
            dailyQuestion: '삶의 의미는 무엇이라고 생각하나요?',
            dailyAnswer: '삶의 의미는 정해진 것이 아니라 스스로 만들어가는 과정 그 자체라고 생각한다.',
            submissionDate: yesterdayStr,
            status: 'approved',
            submittedAt: Timestamp.now(),
        });
    }

    await submissionsBatch.commit();
    console.log('✅ 10 Dummy submissions created.');
    console.log('🎉 Setup complete!');
}

setupCohort0().catch(console.error);
