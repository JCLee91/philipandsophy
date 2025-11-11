'use client';

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { getStorageInstance } from './client';
import { STORAGE_PATHS, generateStorageFileName } from '@/constants/storage';

/**
 * Firebase Storage Operations
 */

// ❌ REMOVED: uploadFile - 미사용 함수 제거 (전용 함수 사용)

/**
 * 파일 업로드 (진행률 추적 가능)
 */
export function uploadFileWithProgress(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storage = getStorageInstance();
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// ❌ REMOVED: uploadMultipleFiles - 미사용 함수 제거

/**
 * 이미지 업로드 (독서 인증용)
 * 경로: reading_submissions/{participationCode}/{fileName}
 *
 * @param file - 업로드할 이미지 파일
 * @param participationCode - 참가 코드
 * @param cohortId - 코호트 ID (사용 안함, 호환성 유지)
 * @param onProgress - 진행률 콜백
 */
export async function uploadReadingImage(
  file: File,
  participationCode: string,
  cohortId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const fileName = generateStorageFileName(file.name);
  const path = STORAGE_PATHS.READING_SUBMISSION(participationCode, fileName);

  return uploadFileWithProgress(file, path, onProgress);
}

/**
 * 이미지 업로드 (공지용)
 */
export async function uploadNoticeImage(
  file: File,
  cohortId: string
): Promise<string> {
  const fileName = generateStorageFileName(file.name);
  const path = STORAGE_PATHS.NOTICE(cohortId, fileName);

  return uploadFileWithProgress(file, path);
}

/**
 * 이미지 업로드 (DM용)
 */
export async function uploadDMImage(
  file: File,
  userId: string
): Promise<string> {
  const fileName = generateStorageFileName(file.name);
  const path = STORAGE_PATHS.DIRECT_MESSAGE(userId, fileName);

  return uploadFileWithProgress(file, path);
}

// ❌ REMOVED: deleteFile - 미사용 함수 제거 (이미지 삭제 기능 미구현)
// ❌ REMOVED: deleteMultipleFiles - 미사용 함수 제거
