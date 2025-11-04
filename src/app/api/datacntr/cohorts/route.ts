import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // 모든 코호트 조회 (최신순)
    const cohortsSnapshot = await db
      .collection(COLLECTIONS.COHORTS)
      .orderBy('createdAt', 'desc')
      .get();

    const cohorts = cohortsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(cohorts);
  } catch (error) {

    return NextResponse.json(
      { error: '코호트 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();
    const body = await request.json();

    const {
      name,
      startDate,
      endDate,
      programStartDate,
      participants,
      questionsOption,
    } = body;

    // 유효성 검사
    if (!name || !startDate || !endDate || !programStartDate) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: '최소 1명의 참가자가 필요합니다' },
        { status: 400 }
      );
    }

    // 1. 코호트 생성
    const cohortRef = await db.collection(COLLECTIONS.COHORTS).add({
      name,
      startDate,
      endDate,
      programStartDate,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const cohortId = cohortRef.id;

    // 2. 참가자 생성
    const batch = db.batch();
    const participantIds: string[] = [];

    for (const p of participants) {
      const participantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc();
      participantIds.push(participantRef.id);

      batch.set(participantRef, {
        cohortId,
        name: p.name,
        phoneNumber: p.phone,
        isAdministrator: p.role === 'admin',
        isSuperAdmin: false,
        isGhost: p.role === 'ghost',
        firebaseUid: null, // 첫 로그인 시 자동 연결
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // 3. Daily Questions 처리
    if (questionsOption === 'copy') {
      try {
        // 1기(cohortId='1') 질문 복사
        const sourceCohortId = '1';
        const sourceQuestionsSnapshot = await db
          .collection(`${COLLECTIONS.COHORTS}/${sourceCohortId}/daily_questions`)
          .orderBy('dayNumber', 'asc')
          .get();

        if (!sourceQuestionsSnapshot.empty) {
          const questionsBatch = db.batch();

          sourceQuestionsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const targetRef = db
              .collection(`${COLLECTIONS.COHORTS}/${cohortId}/daily_questions`)
              .doc(doc.id);

            // 날짜 재계산
            const dayNumber = data.dayNumber;
            const newDate = new Date(programStartDate);
            newDate.setDate(newDate.getDate() + (dayNumber - 1));
            const dateStr = newDate.toISOString().split('T')[0];

            questionsBatch.set(targetRef, {
              ...data,
              date: dateStr, // 날짜 업데이트
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          });

          await questionsBatch.commit();

        }
      } catch (error) {

        // 실패해도 코호트 생성은 성공으로 처리
      }
    }

    return NextResponse.json({
      success: true,
      cohortId,
      participantIds,
      message: `${name} 생성 완료`,
    });

  } catch (error) {

    return NextResponse.json(
      { error: '코호트 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
