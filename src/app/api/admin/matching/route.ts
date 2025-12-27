import { NextRequest, NextResponse } from 'next/server';
import { getDailyQuestion } from '@/lib/firebase/daily-questions';
import { getSubmissionDate } from '@/lib/date-utils';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * POST /api/admin/matching
 * AI 매칭 실행 API - Cloud Run 함수로 위임
 */
export async function POST(request: NextRequest) {
  // 관리자 권한 검증
  const { user, error } = await requireWebAppAdmin(request);
  if (error) {
    return error;
  }

  let requestCohortId: string | undefined;

  try {
    const body = await request.json();
    const { cohortId } = body ?? {};
    requestCohortId = cohortId;

    console.log('🔍 [Backend API] Received request:', {
      cohortId,
      bodyKeys: Object.keys(body ?? {})
    });

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // Cloud Run 함수 URL (환경변수에서 가져오기)
    const v3Url = process.env.MANUAL_CLUSTER_MATCHING_URL || 'https://manualclustermatching-vliq2xsjqa-du.a.run.app';
    const matchingUrl = v3Url;

    // 디버깅 로그 추가
    console.log('🔍 [Backend API] URL Selection:', {
      v3Url,
      selectedUrl: matchingUrl
    });
    
    logger.info('Matching URL selection', {
      cohortId,
      v3Url,
      selectedUrl: matchingUrl
    });

    if (!matchingUrl) {
       return NextResponse.json(
        { error: '매칭 함수 URL이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 원본 Authorization 헤더에서 ID 토큰 추출
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      );
    }

    // Cloud Run 함수 호출 - 원본 ID 토큰 그대로 전달
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET;

    const response = await fetch(matchingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // 원본 ID 토큰 그대로 전달
        ...(internalSecret ? { 'X-Internal-Secret': internalSecret } : {})
      },
      body: JSON.stringify({ cohortId })
    });

    // Content-Type 체크
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = '매칭 실행 실패';

      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
      } else {
        try {
          const textError = await response.text();
          if (textError) {
            errorMessage = textError;
          }
        } catch {
          // 텍스트 읽기도 실패하면 기본 메시지 사용
        }
      }

      logger.error('Cloud Run 매칭 함수 호출 실패', {
        cohortId: requestCohortId,
        status: response.status,
        error: errorMessage
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // 성공 응답 처리
    if (!isJson) {
      throw new Error('서버에서 잘못된 응답 형식을 반환했습니다.');
    }

    const result = await response.json();

    console.log('🔍 [Backend API] Cloud Run Response:', {
      matchingVersion: result.matching?.matchingVersion,
      hasClusters: !!result.matching?.clusters,
      hasAssignments: !!result.matching?.assignments,
      totalParticipants: result.totalParticipants
    });

    // Cloud Run 함수의 응답을 그대로 반환
    // (프리뷰 모드이므로 Firestore에는 저장하지 않음)
    return NextResponse.json(result);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('AI 매칭 API 실행 실패', {
      cohortId: requestCohortId,
      error: message,
    });

    return NextResponse.json(
      {
        error: '매칭 실행 중 오류가 발생했습니다.',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/matching?cohortId=xxx&date=yyyy-mm-dd
 * 특정 날짜의 매칭 결과 조회
 */
export async function GET(request: NextRequest) {
  // 관리자 권한 검증
  const { error: authError } = await requireWebAppAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const cohortId = searchParams.get('cohortId');
    // ✅ FIX: 새벽 2시 마감 정책 적용 (getSubmissionDate 사용)
    const date = searchParams.get('date') || getSubmissionDate();

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // Cohort 문서에서 매칭 결과 가져오기
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();

    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: 'Cohort를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const dailyFeaturedParticipants = cohortDoc.data()?.dailyFeaturedParticipants || {};
    const matchingEntry = dailyFeaturedParticipants[date];

    if (!matchingEntry) {
      return NextResponse.json(
        {
          error: '해당 날짜의 매칭 결과가 없습니다.',
          availableDates: Object.keys(dailyFeaturedParticipants),
          requestedDate: date,
        },
        { status: 404 }
      );
    }

    // v3.0+ 형식: assignments 필드가 존재
    const normalizedMatching = {
      assignments: matchingEntry.assignments ?? {},
    };

    // cohort별 daily question 조회
    const questionObj = await getDailyQuestion(cohortId, date);

    return NextResponse.json({
      success: true,
      date,
      question: questionObj?.question || '',
      matching: normalizedMatching,
    });

  } catch (error) {

    return NextResponse.json(
      {
        error: '매칭 결과 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
