/**
 * 에어테이블 관련 타입 정의
 */

import { AIRTABLE_FIELDS } from '@/constants/airtable';

/** 에어테이블 레코드 필드 타입 */
export interface AirtableApplicantFields {
  [AIRTABLE_FIELDS.INTERVIEW_RESULT]?: string;
  [AIRTABLE_FIELDS.PHONE_NUMBER]?: string;
  [AIRTABLE_FIELDS.NAME]?: string;
  [AIRTABLE_FIELDS.WELCOME_PAGE_URL]?: string;
  [AIRTABLE_FIELDS.INTERVIEW_SUMMARY]?: string;
}

/** 에어테이블 레코드 */
export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: AirtableApplicantFields;
}

/** 에어테이블 API 응답 */
export interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

/** 처리 결과 */
export interface ProcessResult {
  recordId: string;
  name: string;
  phoneNumber: string;
  success: boolean;
  welcomePageUrl?: string;
  error?: string;
  isNewParticipant?: boolean;
}

/** Cron Job 실행 결과 */
export interface CronJobResult {
  success: boolean;
  processed: number;
  successCount: number;
  failCount: number;
  results: ProcessResult[];
  executedAt: string;
}
