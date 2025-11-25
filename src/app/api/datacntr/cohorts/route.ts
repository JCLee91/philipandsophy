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
      sourceCohortId,
      useClusterMatching,
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

    // 1. 코호트 ID 생성: "4-1기" → "4-1", "3기" → "3"
    // 숫자와 하이픈(-)만 남기고 제거
    const cohortNumber = name.replace(/[^0-9-]/g, '');
    if (!cohortNumber) {
      return NextResponse.json(
        { error: '기수명에 숫자나 하이픈이 포함되어야 합니다 (예: 4-1기)' },
        { status: 400 }
      );
    }

    // 코호트 문서 ID 설정
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
      useClusterMatching: useClusterMatching ?? true, // 기본값 true
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. 참가자 생성 (문서 ID: cohort{기수}-{이름(성제외)})
    // 2-1. 자동 마이그레이션: 기존 참가자들의 UID 조회
    const phoneNumbers = participants.map((p: any) => p.phone);
    const phoneToUidMap = new Map<string, string>();

    // Firestore 'in' 쿼리는 최대 30개까지만 지원하므로 청크로 나누어 조회
    const CHUNK_SIZE = 30;
    const chunks = [];
    for (let i = 0; i < phoneNumbers.length; i += CHUNK_SIZE) {
      chunks.push(phoneNumbers.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      const snapshot = await db.collection(COLLECTIONS.PARTICIPANTS)
        .where('phoneNumber', 'in', chunk)
        .get();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.firebaseUid && data.phoneNumber) {
          phoneToUidMap.set(data.phoneNumber, data.firebaseUid);
        }
      });
    }

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

      // 기존 UID가 있으면 자동 연결 (마이그레이션)
      const existingUid = phoneToUidMap.get(p.phone) || null;

      const participantData: any = {
        cohortId,
        name: p.name,
        phoneNumber: p.phone,
        isAdministrator: p.role === 'admin',
        isSuperAdmin: false,
        isGhost: p.role === 'ghost',
        firebaseUid: existingUid, // 자동 연결
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 성별 정보 추가
      if (p.gender) {
        participantData.gender = p.gender;
      }

      batch.set(participantRef, participantData);
    }

    await batch.commit();

    // 3. Daily Questions 처리 (Day 2~14만, 총 13개)
    if (questionsOption === 'copy') {
      try {
        // 복사할 기수 ID가 지정되지 않았다면 가장 최근 기수 사용
        let actualSourceCohortId = sourceCohortId;
        
        if (!actualSourceCohortId) {
            const recentCohortsSnapshot = await db.collection(COLLECTIONS.COHORTS)
            .orderBy('createdAt', 'desc')
            .limit(2) 
            .get();
            
            const latestCohort = recentCohortsSnapshot.docs.find(doc => doc.id !== cohortId);
            if (latestCohort) {
                actualSourceCohortId = latestCohort.id;
            } else {
                actualSourceCohortId = '1'; // fallback
            }
        }

        // 질문 복사 (Day 2부터 시작, Day 1은 OT)
        const sourceQuestionsSnapshot = await db
          .collection(`${COLLECTIONS.COHORTS}/${actualSourceCohortId}/daily_questions`)
          .where('dayNumber', '>=', 2)
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
        logger.error('질문 복사 실패:', error);
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
