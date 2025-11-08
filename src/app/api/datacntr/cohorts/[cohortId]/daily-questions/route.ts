import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteContext {
  params: Promise<{ cohortId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { cohortId } = await context.params;
    const db = getAdminDb();

    // Daily Questions 조회
    const questionsSnapshot = await db
      .collection(`${COLLECTIONS.COHORTS}/${cohortId}/daily_questions`)
      .orderBy('dayNumber', 'asc')
      .get();

    const questions = questionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(questions);
  } catch (error) {

    return NextResponse.json(
      { error: 'Daily Questions 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { cohortId } = await context.params;
    const db = getAdminDb();
    const body = await request.json();

    const { questions } = body;

    // 유효성 검사
    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: '질문 데이터가 올바르지 않습니다' },
        { status: 400 }
      );
    }

    if (questions.length !== 14) {
      return NextResponse.json(
        { error: '정확히 14개의 질문이 필요합니다' },
        { status: 400 }
      );
    }

    // 기존 문서들 조회 (createdAt 유지용)
    const existingDocsPromises = questions.map(q =>
      db.collection(`${COLLECTIONS.COHORTS}/${cohortId}/daily_questions`)
        .doc(q.dayNumber.toString())
        .get()
    );
    const existingDocs = await Promise.all(existingDocsPromises);
    const existingCreatedAtMap = new Map<string, any>();

    existingDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data();
        existingCreatedAtMap.set(doc.id, data?.createdAt);
      }
    });

    // Batch로 저장
    const batch = db.batch();

    questions.forEach((q) => {
      if (!q.category || !q.question) {
        throw new Error('모든 질문의 카테고리와 내용이 필요합니다');
      }

      const docId = q.dayNumber.toString();
      const ref = db
        .collection(`${COLLECTIONS.COHORTS}/${cohortId}/daily_questions`)
        .doc(docId);

      const existingCreatedAt = existingCreatedAtMap.get(docId);

      batch.set(ref, {
        dayNumber: q.dayNumber,
        date: q.date,
        category: q.category,
        question: q.question,
        order: q.dayNumber,
        createdAt: existingCreatedAt || FieldValue.serverTimestamp(), // 기존 유지 또는 새로 생성
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Daily Questions가 저장되었습니다',
    });
  } catch (error) {

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Daily Questions 저장 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
