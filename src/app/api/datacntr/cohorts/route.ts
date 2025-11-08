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

    // 1. 코호트 ID 생성: "3기" → "3"
    const cohortNumber = name.replace(/[^0-9]/g, '');
    if (!cohortNumber) {
      return NextResponse.json(
        { error: '기수명에 숫자가 포함되어야 합니다 (예: 3기)' },
        { status: 400 }
      );
    }

    // 코호트 문서 ID를 숫자로 설정
    const cohortId = cohortNumber;

    // 중복 체크
    const existingCohort = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
    if (existingCohort.exists) {
      return NextResponse.json(
        { error: `${cohortId}기는 이미 존재합니다` },
        { status: 400 }
      );
    }

    // 코호트 생성 (명시적 ID 사용)
    const cohortRef = db.collection(COLLECTIONS.COHORTS).doc(cohortId);
    await cohortRef.set({
      name,
      startDate,
      endDate,
      programStartDate,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. 참가자 생성 (문서 ID: cohort{기수}-{이름(성제외)})
    const batch = db.batch();
    const participantIds: string[] = [];

    // 이름에서 성 제외하는 함수
    const getGivenName = (fullName: string): string => {
      if (fullName.length === 2) {
        return fullName.substring(1); // "김철" → "철"
      } else if (fullName.length >= 3) {
        return fullName.substring(1); // "홍길동" → "길동", "남궁민수" → "궁민수"
      }
      return fullName; // 1자는 그대로
    };

    // 중복 이름 카운터 (같은 이름이 여러 명일 경우 알파벳 추가)
    const nameCountMap = new Map<string, number>();

    for (const p of participants) {
      const givenName = getGivenName(p.name);

      // 중복 이름 처리
      const count = nameCountMap.get(givenName) || 0;
      nameCountMap.set(givenName, count + 1);

      // 알파벳 suffix: A, B, C, D, ...
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const participantId = count === 0
        ? `cohort${cohortId}-${givenName}`                              // 첫 번째: cohort3-철수
        : `cohort${cohortId}-${givenName}${alphabet[count - 1]}`; // 두 번째 이후: cohort3-철수A, cohort3-철수B

      const participantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId);
      participantIds.push(participantId);

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
