import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { API_CACHE_DURATION } from '@/constants/api';
import { stripHtmlTags, cleanBookData } from '@/lib/naver-book-api';
import type { NaverBook } from '@/lib/naver-book-api';

const NAVER_BOOK_API_URL = 'https://openapi.naver.com/v1/search/book.json';

// ❌ REMOVED: NaverBook 타입 중복 제거 (naver-book-api.ts에서 import)
// ❌ REMOVED: stripHtmlTags, cleanBookData 중복 제거 (naver-book-api.ts에서 import)

interface NaverBookSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBook[];
}

/**
 * 네이버 책 검색 API 엔드포인트 (서버 사이드)
 *
 * Query Parameters:
 * - query: 검색어 (필수)
 * - display: 검색 결과 출력 건수 (기본값 10, 최대 100)
 * - start: 검색 시작 위치 (기본값 1, 최대 1000)
 * - sort: 정렬 옵션 (sim=정확도순, date=출간일순)
 */
export async function GET(request: NextRequest) {
  try {
    // 환경변수 확인
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {

      return NextResponse.json(
        { error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Query parameters 추출
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const display = searchParams.get('display') || '10';
    const start = searchParams.get('start') || '1';
    const sort = searchParams.get('sort') || 'sim';

    // 입력 검증
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const displayNum = parseInt(display, 10);
    if (isNaN(displayNum) || displayNum < 1 || displayNum > 100) {
      return NextResponse.json(
        { error: 'Display must be between 1 and 100' },
        { status: 400 }
      );
    }

    const startNum = parseInt(start, 10);
    if (isNaN(startNum) || startNum < 1 || startNum > 1000) {
      return NextResponse.json(
        { error: 'Start must be between 1 and 1000' },
        { status: 400 }
      );
    }

    if (!['sim', 'date'].includes(sort)) {
      return NextResponse.json(
        { error: 'Sort must be either "sim" or "date"' },
        { status: 400 }
      );
    }

    // 네이버 API 호출
    const url = new URL(NAVER_BOOK_API_URL);
    url.searchParams.set('query', query.trim());
    url.searchParams.set('display', display);
    url.searchParams.set('start', start);
    url.searchParams.set('sort', sort);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      next: {
        revalidate: API_CACHE_DURATION.NAVER_BOOK_SEARCH,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: 'Failed to fetch from Naver Book API',
          details: response.status === 429 ? 'Rate limit exceeded' : 'API error'
        },
        { status: response.status }
      );
    }

    const data: NaverBookSearchResponse = await response.json();

    // HTML 태그 제거
    const cleanedData: NaverBookSearchResponse = {
      ...data,
      items: data.items.map(cleanBookData),
    };

    return NextResponse.json(cleanedData, {
      headers: {
        'Cache-Control': `public, s-maxage=${API_CACHE_DURATION.NAVER_BOOK_SEARCH}, stale-while-revalidate=${API_CACHE_DURATION.STALE_WHILE_REVALIDATE}`,
      },
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
