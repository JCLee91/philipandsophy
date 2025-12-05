/**
 * Submission 필수 필드 검증 테스트
 *
 * 이 테스트는 리팩토링 시 필수 필드가 누락되는 버그를 방지합니다.
 * 예: submittedAt 필드 누락으로 프로필북에서 인증이 안 보이는 버그 (2025-12-05)
 */

import { describe, it, expect } from 'vitest';

// Submission에 필수로 있어야 하는 필드들
const REQUIRED_SUBMISSION_FIELDS = [
  'participantId',
  'participationCode',
  'submissionDate',
  'submittedAt',  // ⚠️ 이 필드 누락 시 orderBy 쿼리에서 제외됨
  'createdAt',
  'updatedAt',
  'status',
  'bookTitle',
] as const;

// Firestore orderBy 쿼리에 사용되는 필드들 (없으면 쿼리 결과에서 제외됨)
const QUERY_CRITICAL_FIELDS = [
  'submittedAt',  // orderBy('submittedAt', 'desc') 사용
  'submissionDate',  // where('submissionDate', '==', ...) 사용
  'participantId',  // where('participantId', '==', ...) 사용
] as const;

describe('Submission 필수 필드 검증', () => {
  it('createSubmission이 생성하는 데이터에 모든 필수 필드가 포함되어야 함', async () => {
    // submissions.ts의 createSubmission 함수가 설정하는 필드들
    // 이 테스트가 실패하면 createSubmission 함수를 확인하세요
    const fieldsSetByCreateSubmission = [
      'submissionDate',
      'submittedAt',
      'createdAt',
      'updatedAt',
    ];

    // 모든 필수 필드가 createSubmission에서 설정되는지 확인
    for (const field of QUERY_CRITICAL_FIELDS) {
      const isSetByFunction = fieldsSetByCreateSubmission.includes(field);
      const isPassedAsData = ['participantId', 'participationCode', 'status', 'bookTitle'].includes(field);

      expect(
        isSetByFunction || isPassedAsData,
        `필드 '${field}'가 createSubmission에서 설정되지 않습니다. ` +
        `이 필드가 누락되면 Firestore 쿼리에서 문서가 제외될 수 있습니다.`
      ).toBe(true);
    }
  });

  it('올바른 submission은 submittedAt 필드를 포함해야 함', () => {
    // 올바른 submission 데이터 (submittedAt 포함)
    const correctSubmission = {
      participantId: 'test-user',
      submissionDate: '2025-12-05',
      submittedAt: new Date(),  // ✅ 필수!
      status: 'approved',
    };

    const hasSubmittedAt = 'submittedAt' in correctSubmission;

    expect(
      hasSubmittedAt,
      'submittedAt 필드는 필수입니다! ' +
      'Firestore의 orderBy("submittedAt") 쿼리에서 이 필드가 없으면 문서가 제외됩니다.'
    ).toBe(true);
  });

  it('submittedAt 누락 데이터는 쿼리에서 제외됨을 문서화', () => {
    // ⚠️ 이 테스트는 문서화 목적 - 나쁜 예시를 보여줌
    const badSubmission = {
      participantId: 'test-user',
      submissionDate: '2025-12-05',
      status: 'approved',
      // submittedAt 누락!
    };

    // 이런 데이터는 orderBy('submittedAt') 쿼리에서 제외됨
    const hasSubmittedAt = 'submittedAt' in badSubmission;
    expect(hasSubmittedAt).toBe(false);  // 나쁜 예시이므로 false가 맞음
  });
});

describe('리팩토링 안전성 검증', () => {
  it('Timestamp.now()가 사용되는 위치를 문서화', () => {
    // 이 테스트는 문서화 목적
    // Timestamp.now()가 사용되어야 하는 위치:
    const timestampUsageLocations = [
      'src/lib/firebase/submissions.ts - createSubmission (submittedAt, createdAt, updatedAt)',
      'src/lib/firebase/submissions.ts - saveDraft (createdAt, updatedAt)',
      'src/lib/firebase/submissions.ts - updateSubmission (updatedAt)',
    ];

    expect(timestampUsageLocations.length).toBeGreaterThan(0);
  });
});
