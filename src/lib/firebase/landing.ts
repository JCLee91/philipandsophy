import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from './client';
import { LandingConfig, DEFAULT_LANDING_CONFIG } from '@/types/landing';
import { logger } from '@/lib/logger';

const CONFIG_COLLECTION = 'config';
const LANDING_DOC_ID = 'landing';

/**
 * 랜딩 페이지 설정을 가져옵니다.
 * 문서가 없으면 기본값을 반환합니다.
 */
export async function getLandingConfig(): Promise<LandingConfig> {
  try {
    const db = getDb();
    const docRef = doc(db, CONFIG_COLLECTION, LANDING_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as LandingConfig;
    } else {
      logger.warn('Landing config not found, using default.');
      return DEFAULT_LANDING_CONFIG;
    }
  } catch (error) {
    // 에러 객체를 명시적으로 로깅 (빈 객체로 나오는 현상 방지)
    console.error('[LandingConfig Error]', error);
    logger.error('Failed to fetch landing config', error);
    return DEFAULT_LANDING_CONFIG;
  }
}

/**
 * 랜딩 페이지 설정을 업데이트합니다.
 */
export async function updateLandingConfig(
  config: Partial<LandingConfig>,
  userEmail?: string
): Promise<void> {
  try {
    const db = getDb();
    const docRef = doc(db, CONFIG_COLLECTION, LANDING_DOC_ID);
    
    const updateData = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail || 'system',
    };

    await setDoc(docRef, updateData, { merge: true });
    logger.info('Landing config updated successfully');
  } catch (error) {
    console.error('[LandingConfig Update Error]', error);
    logger.error('Failed to update landing config', error);
    throw error;
  }
}
