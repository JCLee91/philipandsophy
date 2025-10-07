/**
 * Naver Book Search API Utility (Client-side)
 *
 * 네이버 책 검색 API를 클라이언트에서 호출합니다.
 * API 키 보안을 위해 Next.js API Route를 통해 간접 호출합니다.
 *
 * @see https://developers.naver.com/docs/serviceapi/search/book/book.md
 */

export interface NaverBookSearchParams {
  /** 검색어 (필수) */
  query: string;
  /** 검색 결과 출력 건수 (기본값: 10, 최대: 100) */
  display?: number;
  /** 검색 시작 위치 (기본값: 1, 최대: 1000) */
  start?: number;
  /** 정렬 방법 (sim: 유사도순, date: 출간일순) */
  sort?: 'sim' | 'date';
}

export interface NaverBook {
  /** 책 제목 */
  title: string;
  /** 책 설명 */
  description: string;
  /** 저자 */
  author: string;
  /** 출판사 */
  publisher: string;
  /** ISBN (국제 표준 도서 번호) */
  isbn: string;
  /** 출간일 (YYYYMMDD 형식) */
  pubdate: string;
  /** 책 표지 이미지 URL */
  image: string;
  /** 네이버 책 상세 페이지 URL */
  link: string;
  /** 정가 */
  discount: string;
}

export interface NaverBookSearchResponse {
  /** 검색 결과를 생성한 시간 */
  lastBuildDate: string;
  /** 총 검색 결과 개수 */
  total: number;
  /** 검색 시작 위치 */
  start: number;
  /** 한 번에 표시할 검색 결과 개수 */
  display: number;
  /** 검색 결과 배열 */
  items: NaverBook[];
}

/**
 * 네이버 책 검색 API를 호출합니다.
 * 보안을 위해 서버 사이드 API Route (/api/search-books)를 통해 호출합니다.
 *
 * @param params - 검색 파라미터
 * @returns 검색 결과
 *
 * @example
 * ```ts
 * const books = await searchNaverBooks({
 *   query: '해리포터',
 *   display: 10,
 *   sort: 'sim'
 * });
 * ```
 */
export async function searchNaverBooks(
  params: NaverBookSearchParams
): Promise<NaverBookSearchResponse> {
  const url = new URL('/api/search-books', window.location.origin);
  url.searchParams.set('query', params.query);

  if (params.display !== undefined) {
    url.searchParams.set('display', String(params.display));
  }

  if (params.start !== undefined) {
    url.searchParams.set('start', String(params.start));
  }

  if (params.sort !== undefined) {
    url.searchParams.set('sort', params.sort);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(
      errorData.error || `Book search failed with status ${response.status}`
    );
  }

  return response.json();
}

/**
 * HTML 태그를 제거하고 순수 텍스트만 반환합니다.
 * 네이버 API는 검색어를 <b> 태그로 감싸서 반환하므로, 이를 제거합니다.
 *
 * @param html - HTML 문자열
 * @returns 순수 텍스트
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * 네이버 책 검색 결과에서 HTML 태그를 제거합니다.
 *
 * @param book - 네이버 책 정보
 * @returns HTML 태그가 제거된 책 정보
 */
export function cleanBookData(book: NaverBook): NaverBook {
  return {
    ...book,
    title: stripHtmlTags(book.title),
    description: stripHtmlTags(book.description),
    author: stripHtmlTags(book.author),
    publisher: stripHtmlTags(book.publisher),
  };
}
