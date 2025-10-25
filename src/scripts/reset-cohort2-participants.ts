#!/usr/bin/env tsx
/**
 * 2기 참가자 재설정 스크립트
 * - 기존 2기 참가자 삭제
 * - 의미있는 문서 ID로 재생성 (cohort2-윤 형식)
 * - 성 제외하고 이름만 저장
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { Timestamp } from 'firebase-admin/firestore';

const db = getAdminDb();

// 2기 참가자 데이터 (성 제외, 이름만)
const COHORT2_PARTICIPANTS = [
  { firstName: '윤', fullName: '석윤', phone: '01096568878' },
  { firstName: '다빈', fullName: '한다빈', phone: '01045923555' },
  { firstName: '현영', fullName: '이현영', phone: '01093247699' },
  { firstName: '재연', fullName: '최재연', phone: '01030214074' },
  { firstName: '정희', fullName: '윤정희', phone: '01076403114' },
  { firstName: '성완', fullName: '장성완', phone: '01083663939' },
  { firstName: '영신', fullName: '김영신', phone: '01095986899' },
  { firstName: '영빈', fullName: '이영빈', phone: '01028455801' },
  { firstName: '재람', fullName: '양재람', phone: '01025280424' },
  { firstName: '승희', fullName: '유승희', phone: '01073251501' },
  { firstName: '혜진', fullName: '김혜진', phone: '01046451846' },
  { firstName: '수진', fullName: '김수진', phone: '01075529339' },
  { firstName: '태형', fullName: '김태형', phone: '01026671920' },
  { firstName: '한솔', fullName: '김한솔', phone: '01035897818' },
  { firstName: '재원1', fullName: '이재원', phone: '01076655917' },
  { firstName: '진우', fullName: '박진우', phone: '01055801188' },
  { firstName: '양원', fullName: '정양원', phone: '01086642851' },
  { firstName: '원우', fullName: '이원우', phone: '01082776734' },
  { firstName: '상준', fullName: '장상준', phone: '01094337327' },
  { firstName: '호연', fullName: '이호연', phone: '01056080230' },
  { firstName: '성국', fullName: '장성국', phone: '01097898783' },
  { firstName: '석원', fullName: '정석원', phone: '01028763033' },
  { firstName: '도환', fullName: '김도환', phone: '01025159100' },
  { firstName: '재원2', fullName: '차재원', phone: '01053965965' },
];

const COHORT_ID = '2';

async function resetCohort2Participants() {
  try {
    console.log('🔄 2기 참가자 재설정 시작...\n');

    // 1. 기존 2기 참가자 삭제
    console.log('🗑️  기존 2기 참가자 삭제 중...');
    const existingParticipants = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .where('cohortId', '==', COHORT_ID)
      .get();

    const deleteBatch = db.batch();
    existingParticipants.forEach((doc) => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log(`✅ ${existingParticipants.size}명 삭제 완료\n`);

    // 2. 새로운 참가자 추가 (의미있는 문서 ID)
    console.log('➕ 새로운 참가자 추가 중...\n');
    const addBatch = db.batch();

    for (const p of COHORT2_PARTICIPANTS) {
      // 문서 ID: cohort2-윤, cohort2-다빈 형식
      const docId = `cohort2-${p.firstName}`;
      const participantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc(docId);

      addBatch.set(participantRef, {
        cohortId: COHORT_ID,
        name: p.firstName, // 성 제외, 이름만
        phoneNumber: p.phone,
        isAdministrator: false,
        isSuperAdmin: false,
        firebaseUid: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`  ✅ ${p.firstName} (${p.fullName}) - ID: ${docId}`);
    }

    await addBatch.commit();

    console.log('\n✨ 2기 참가자 재설정 완료!');
    console.log(`\n📋 추가된 참가자: ${COHORT2_PARTICIPANTS.length}명`);
    console.log('📱 문서 ID: cohort2-{이름} 형식');
    console.log('👤 이름 필드: 성 제외, 이름만 저장');

    process.exit(0);
  } catch (error) {
    console.error('❌ 재설정 중 오류 발생:', error);
    process.exit(1);
  }
}

resetCohort2Participants();
