'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getAuthInstance, getParticipantByFirebaseUid, signOut as firebaseSignOut } from '@/lib/firebase';
import { Participant } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * Firebase Auth 기반 세션 관리 훅
 *
 * onAuthStateChanged를 사용하여 자동 세션 감지 및 복구
 * - 60일 자동 세션 유지 (Firebase Refresh Token)
 * - PWA 앱 전환, 뒤로가기, 배포 시에도 세션 유지
 * - 네트워크 에러 시에도 로컬 상태 보존
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Firebase Auth 상태 변화 구독
  useEffect(() => {
    const auth = getAuthInstance();

    // onAuthStateChanged: Firebase가 자동으로 세션 상태 감지
    // - 페이지 로드 시
    // - Refresh token 갱신 시
    // - 로그인/로그아웃 시
    // - 다른 탭에서 세션 변경 시
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      logger.debug('Firebase Auth 상태 변화', { uid: user?.uid, hasUser: !!user });

      setFirebaseUser(user);

      if (!user) {
        // 로그아웃 상태
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      // Firebase 로그인 상태 → Firestore에서 참가자 정보 조회
      try {
        const participant = await getParticipantByFirebaseUid(user.uid);

        if (participant) {
          setCurrentUser(participant);
          logger.debug('참가자 정보 로드 완료', { participantId: participant.id });
        } else {
          // Firebase에는 로그인되어 있지만 Firestore에 참가자 정보가 없는 경우
          logger.warn('Firebase UID와 연결된 참가자 없음', { uid: user.uid });
          setCurrentUser(null);

          // Firebase 로그아웃 (동기화 문제 방지)
          await firebaseSignOut();
        }
      } catch (error) {
        // 네트워크 에러 등: 기존 상태 유지
        logger.error('참가자 정보 조회 실패 (상태 유지):', error);

        // 기존 currentUser가 있으면 유지, 없으면 null
        if (!currentUser) {
          setCurrentUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup: 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, []); // 빈 의존성 배열: Firebase가 자동으로 모든 상태 변화 감지

  // 로그아웃
  const logout = async () => {
    try {
      await firebaseSignOut();
      logger.info('로그아웃 성공');

      // onAuthStateChanged가 자동으로 currentUser를 null로 설정
      // 명시적으로 페이지 이동
      router.replace('/app');
    } catch (error) {
      logger.error('로그아웃 실패:', error);

      // 로그아웃 실패해도 페이지는 이동
      router.replace('/app');
    }
  };

  return {
    currentUser,
    firebaseUser,
    isLoading,
    isAuthenticated: !!currentUser && !!firebaseUser,
    logout,
  };
}
