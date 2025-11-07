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

/**
 * Firebase Storage Operations
 */

/**
 * 파일 업로드 (간단한 버전)
 */
export async function uploadFile(
  file: File,
  path: string
): Promise<string> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

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

/**
 * 다중 파일 업로드
 */
export async function uploadMultipleFiles(
  files: File[],
  basePath: string
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const fileName = `${Date.now()}_${index}_${file.name}`;
    const path = `${basePath}/${fileName}`;
    return uploadFile(file, path);
  });

  return Promise.all(uploadPromises);
}

/**
 * 이미지 업로드 (독서 인증용)
 * 새 구조: cohorts/{cohortId}/submissions/{participantId}/{fileName}
 */
export async function uploadReadingImage(
  file: File,
  participantId: string,
  cohortId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const path = `cohorts/cohort${cohortId}/submissions/${participantId}/${fileName}`;

  return uploadFileWithProgress(file, path, onProgress);
}

/**
 * 이미지 업로드 (공지용)
 */
export async function uploadNoticeImage(
  file: File,
  cohortId: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const path = `notices/${cohortId}/${fileName}`;

  return uploadFile(file, path);
}

/**
 * 이미지 업로드 (DM용)
 */
export async function uploadDMImage(
  file: File,
  userId: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const path = `direct_messages/${userId}/${fileName}`;

  return uploadFile(file, path);
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  const storage = getStorageInstance();
  const fileRef = ref(storage, fileUrl);

  await deleteObject(fileRef);
}

/**
 * 다중 파일 삭제
 */
export async function deleteMultipleFiles(fileUrls: string[]): Promise<void> {
  const deletePromises = fileUrls.map((url) => deleteFile(url));
  await Promise.all(deletePromises);
}
