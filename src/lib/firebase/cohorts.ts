'use client';

/**
 * Firebase Cohorts Operations
 * Manage reading group cohorts
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { getDb } from './client';
import type { Cohort, DailyMatchingEntry } from '@/types/database';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * Create a new cohort
 */
export const createCohort = async (data: {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}): Promise<string> => {
  const db = getDb();
  const cohortsRef = collection(db, COLLECTIONS.COHORTS);

  const newCohort = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(cohortsRef, newCohort);
  return docRef.id;
};

/**
 * Create cohort with custom ID
 */
export const createCohortWithId = async (
  id: string,
  data: {
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }
): Promise<void> => {
  const db = getDb();
  const cohortRef = doc(db, COLLECTIONS.COHORTS, id);

  const newCohort = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(cohortRef, newCohort);
};

/**
 * Get cohort by ID
 */
export const getCohortById = async (id: string): Promise<Cohort | null> => {
  const db = getDb();
  const cohortRef = doc(db, COLLECTIONS.COHORTS, id);
  const snapshot = await getDoc(cohortRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Cohort;
};

/**
 * Get all cohorts
 */
export const getAllCohorts = async (): Promise<Cohort[]> => {
  const db = getDb();
  const cohortsRef = collection(db, COLLECTIONS.COHORTS);
  const snapshot = await getDocs(cohortsRef);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Cohort[];
};

/**
 * Get active cohorts
 */
export const getActiveCohorts = async (): Promise<Cohort[]> => {
  const db = getDb();
  const cohortsRef = collection(db, COLLECTIONS.COHORTS);
  const q = query(cohortsRef, where('isActive', '==', true));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Cohort[];
};

/**
 * Update cohort
 */
export const updateCohort = async (
  id: string,
  data: Partial<Omit<Cohort, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const db = getDb();
  const cohortRef = doc(db, COLLECTIONS.COHORTS, id);

  await updateDoc(cohortRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete cohort
 */
export const deleteCohort = async (id: string): Promise<void> => {
  const db = getDb();
  const cohortRef = doc(db, COLLECTIONS.COHORTS, id);
  await deleteDoc(cohortRef);
};

/**
 * Update daily featured participants (AI matching results)
 */
export const updateDailyFeaturedParticipants = async (
  cohortId: string,
  date: string,
  matching: DailyMatchingEntry
): Promise<void> => {
  const db = getDb();
  const cohortRef = doc(db, COLLECTIONS.COHORTS, cohortId);

  // 기존 데이터 가져오기
  const cohortDoc = await getDoc(cohortRef);
  if (!cohortDoc.exists()) {
    throw new Error(`Cohort not found: ${cohortId}`);
  }

  const existingData = cohortDoc.data();
  const dailyFeaturedParticipants = existingData.dailyFeaturedParticipants || {};

  // 새로운 매칭 추가
  dailyFeaturedParticipants[date] = matching;

  // 업데이트
  await updateDoc(cohortRef, {
    dailyFeaturedParticipants,
    updatedAt: Timestamp.now(),
  });
};
