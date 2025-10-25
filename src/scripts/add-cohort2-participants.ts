#!/usr/bin/env tsx
/**
 * 2기 참가자 추가 스크립트
 *
 * 사용법:
 * npm run add:cohort2-participants
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { Timestamp } from 'firebase-admin/firestore';

const db = getAdminDb();

// CSV에서 추출한 2기 참가자 데이터 (24명)
const COHORT2_PARTICIPANTS = [
  { name: '석윤', phone: '01096568878' },
  { name: '한다빈', phone: '01045923555' },
  { name: '이현영', phone: '01093247699' },
  { name: '최재연', phone: '01030214074' },
  { name: '윤정희', phone: '01076403114' },
  { name: '장성완', phone: '01083663939' },
  { name: '김영신', phone: '01095986899' },
  { name: '이영빈', phone: '01028455801' },
  { name: '양재람', phone: '01025280424' },
  { name: '유승희', phone: '01073251501' },
  { name: '김혜진', phone: '01046451846' },
  { name: '김수진', phone: '01075529339' },
  { name: '김태형', phone: '01026671920' },
  { name: '김한솔', phone: '01035897818' },
  { name: '이재원', phone: '01076655917' },
  { name: '박진우', phone: '01055801188' },
  { name: '정양원', phone: '01086642851' },
  { name: '이원우', phone: '01082776734' },
  { name: '장상준', phone: '01094337327' },
  { name: '이호연', phone: '01056080230' },
  { name: '장성국', phone: '01097898783' },
  { name: '정석원', phone: '01028763033' },
  { name: '김도환', phone: '01025159100' },
  { name: '차재원', phone: '01053965965' },
];

const COHORT_ID = '2'; // 2기

async function addCohort2Participants() {
  try {
    console.log('📚 2기 참가자 추가 시작...\n');
    console.log(`Cohort ID: ${COHORT_ID}`);
    console.log(`참가자 수: ${COHORT2_PARTICIPANTS.length}명\n`);

    // 2기 cohort 존재 확인
    const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(COHORT_ID).get();
    if (!cohortDoc.exists) {
      throw new Error(`Cohort ${COHORT_ID} not found`);
    }

    console.log('✅ 2기 Cohort 확인 완료\n');

    // 배치로 참가자 추가
    const batch = db.batch();
    const participantIds: string[] = [];

    for (const p of COHORT2_PARTICIPANTS) {
      const participantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc();
      participantIds.push(participantRef.id);

      batch.set(participantRef, {
        cohortId: COHORT_ID,
        name: p.name,
        phoneNumber: p.phone,
        isAdministrator: false,
        isSuperAdmin: false,
        firebaseUid: null, // 첫 로그인 시 자동 연결
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`  ✅ ${p.name} (${p.phone})`);
    }

    await batch.commit();

    console.log('\n✨ 2기 참가자 추가 완료!');
    console.log(`\n📋 추가된 참가자: ${COHORT2_PARTICIPANTS.length}명`);
    console.log('📱 첫 로그인 시 firebaseUid가 자동으로 연결됩니다.');

    process.exit(0);
  } catch (error) {
    console.error('❌ 참가자 추가 중 오류 발생:', error);
    process.exit(1);
  }
}

addCohort2Participants();
