'use client';

import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import { getDb } from './client';
import { getCohortById } from './cohorts';
import { DailyQuestion, COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * 특정 날짜의 Daily Question 조회
 *
 * @param cohortId - 기수 ID
 * @param date - 날짜 (ISO: "2025-10-11")
 * @returns DailyQuestion 또는 null
 */
export async function getDailyQuestion(
  cohortId: string,
  date: string
): Promise<DailyQuestion | null> {
  try {
    const db = getDb();

    // 1. Cohort 정보 가져오기
    const cohort = await getCohortById(cohortId);
    if (!cohort) {

      return null;
    }

    // 2. programStartDate 기준으로 Day 계산 (fallback to startDate for backward compatibility)
    const programStart = cohort.programStartDate || cohort.startDate;
    if (!programStart) {

      return null;
    }

    const startDate = parseISO(programStart);
    const currentDate = parseISO(date);
    const dayNumber = differenceInDays(currentDate, startDate) + 1;

    // 3. 범위 체크 (1-14일)
    if (dayNumber < 1 || dayNumber > 14) {

      return null;
    }

    // 4. 해당 Day의 질문 조회
    const questionDoc = await getDoc(
      doc(db, `${COLLECTIONS.COHORTS}/${cohortId}/daily_questions`, dayNumber.toString())
    );

    if (!questionDoc.exists()) {

      return null;
    }

    return { id: questionDoc.id, ...questionDoc.data() } as DailyQuestion;

  } catch (error) {

    return null;
  }
}

/**
 * 특정 날짜의 질문 텍스트만 조회 (간편 함수)
 *
 * @param cohortId - 기수 ID
 * @param date - 날짜 (ISO: "2025-10-11")
 * @returns 질문 텍스트 또는 빈 문자열
 */
export async function getDailyQuestionText(
  cohortId: string,
  date: string
): Promise<string> {
  const question = await getDailyQuestion(cohortId, date);
  return question?.question || '';
}

/**
 * 기수의 모든 Daily Questions 조회
 *
 * @param cohortId - 기수 ID
 * @returns DailyQuestion 배열 (dayNumber 순으로 정렬)
 */
export async function getAllDailyQuestions(
  cohortId: string
): Promise<DailyQuestion[]> {
  try {
    const db = getDb();
    const q = query(
      collection(db, `${COLLECTIONS.COHORTS}/${cohortId}/daily_questions`),
      orderBy('dayNumber', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DailyQuestion[];

  } catch (error) {

    return [];
  }
}

/**
 * Daily Questions 일괄 생성
 *
 * @param cohortId - 기수 ID
 * @param questions - 질문 배열 (14개)
 */
export async function createDailyQuestions(
  cohortId: string,
  questions: Array<{
    category: string;
    question: string;
  }>
): Promise<void> {
  try {
    const db = getDb();
    const cohort = await getCohortById(cohortId);

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    const programStart = cohort.programStartDate || cohort.startDate;
    if (!programStart) {
      throw new Error('Neither programStartDate nor startDate set for cohort');
    }

    if (questions.length !== 14) {
      throw new Error('Must provide exactly 14 questions');
    }

    // 각 Day별로 문서 생성
    const promises = questions.map(async (q, index) => {
      const dayNumber = index + 1;
      const date = format(
        addDays(parseISO(programStart), index),
        'yyyy-MM-dd'
      );

      const questionData: Omit<DailyQuestion, 'id'> = {
        dayNumber,
        date,
        category: q.category,
        question: q.question,
        order: dayNumber,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(
        doc(db, `${COLLECTIONS.COHORTS}/${cohortId}/daily_questions`, dayNumber.toString()),
        questionData
      );
    });

    await Promise.all(promises);

  } catch (error) {

    throw error;
  }
}

/**
 * 다른 기수의 질문 복사
 *
 * @param sourceCohortId - 원본 기수 ID
 * @param targetCohortId - 대상 기수 ID
 */
export async function copyDailyQuestions(
  sourceCohortId: string,
  targetCohortId: string
): Promise<void> {
  try {
    // 1. 원본 질문 조회
    const sourceQuestions = await getAllDailyQuestions(sourceCohortId);

    if (sourceQuestions.length === 0) {
      throw new Error('Source cohort has no daily questions');
    }

    // 2. 대상 기수에 생성
    await createDailyQuestions(
      targetCohortId,
      sourceQuestions.map(q => ({
        category: q.category,
        question: q.question,
      }))
    );

  } catch (error) {

    throw error;
  }
}
