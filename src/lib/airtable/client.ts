/**
 * 에어테이블 API 클라이언트
 * 합격자 레코드 조회 및 웰컴 URL 업데이트
 */

import { logger } from '@/lib/logger';
import {
  AIRTABLE_FIELDS,
  AIRTABLE_CONFIG,
  INTERVIEW_RESULT_PASS,
} from '@/constants/airtable';
import type { AirtableRecord, AirtableResponse } from './types';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

/**
 * 에어테이블 API URL 생성
 */
function getApiUrl(): string {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    throw new Error('Airtable configuration missing: BASE_ID or TABLE_ID');
  }
  return `${AIRTABLE_CONFIG.BASE_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
}

/**
 * 에어테이블 API 헤더 생성
 */
function getHeaders(): HeadersInit {
  if (!AIRTABLE_API_KEY) {
    throw new Error('Airtable API key is not configured');
  }
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 합격이고 웰컴 페이지가 비어있는 레코드 조회
 * 필터 조건: 인터뷰 결과 = "합격-" AND 월컴 페이지 = 빈값
 */
export async function fetchPendingRecords(): Promise<AirtableRecord[]> {
  const filterFormula = `AND(
    {${AIRTABLE_FIELDS.INTERVIEW_RESULT}} = '${INTERVIEW_RESULT_PASS}',
    OR(
      {${AIRTABLE_FIELDS.WELCOME_PAGE_URL}} = '',
      {${AIRTABLE_FIELDS.WELCOME_PAGE_URL}} = BLANK()
    )
  )`;

  const params = new URLSearchParams({
    filterByFormula: filterFormula,
  });

  const url = `${getApiUrl()}?${params.toString()}`;

  logger.info('Fetching pending records from Airtable', {
    filterFormula: filterFormula.replace(/\s+/g, ' ').trim(),
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Airtable fetch failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
  }

  const data: AirtableResponse = await response.json();

  logger.info('Fetched pending records', {
    count: data.records.length,
  });

  return data.records;
}

/**
 * 레코드의 웰컴 페이지 URL 업데이트
 */
export async function updateWelcomeUrl(
  recordId: string,
  welcomePageUrl: string
): Promise<void> {
  const url = `${getApiUrl()}/${recordId}`;

  logger.info('Updating welcome URL in Airtable', {
    recordId,
    urlLength: welcomePageUrl.length,
  });

  const response = await fetch(url, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      fields: {
        [AIRTABLE_FIELDS.WELCOME_PAGE_URL]: welcomePageUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Airtable update failed', {
      recordId,
      status: response.status,
      error: errorText,
    });
    throw new Error(`Failed to update record ${recordId}: ${response.status}`);
  }

  logger.info('Successfully updated welcome URL', { recordId });
}

/**
 * 환경변수 설정 확인
 */
export function validateAirtableConfig(): boolean {
  const missing: string[] = [];

  if (!AIRTABLE_API_KEY) missing.push('AIRTABLE_API_KEY');
  if (!AIRTABLE_BASE_ID) missing.push('AIRTABLE_BASE_ID');
  if (!AIRTABLE_TABLE_ID) missing.push('AIRTABLE_TABLE_ID');

  if (missing.length > 0) {
    logger.error('Missing Airtable configuration', { missing });
    return false;
  }

  return true;
}
