'use client';

import { useState, useEffect, useRef } from 'react';
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
 * - Race condition 방지 (useRef로 현재 user 추적)
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Race condition 방지: 현재 Firebase User를 ref로 추적
  const currentFirebaseUserRef = useRef<User | null>(null);

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

      // Ref 업데이트 (stale closure 방지)
      currentFirebaseUserRef.current = user;
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

        // Race condition 체크: 비동기 작업 완료 시점에 user가 변경되었는지 확인
        if (currentFirebaseUserRef.current?.uid !== user.uid) {
          logger.warn('Auth state changed during participant fetch, ignoring result', {
            fetchedUid: user.uid,
            currentUid: currentFirebaseUserRef.current?.uid,
          });
          return;
        }

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
        // Race condition 체크
        if (currentFirebaseUserRef.current?.uid !== user.uid) {
          logger.warn('Auth state changed during error handling, ignoring', {
            fetchedUid: user.uid,
            currentUid: currentFirebaseUserRef.current?.uid,
          });
          return;
        }

        // 네트워크 에러: 명확하게 null 설정
        logger.error('참가자 정보 조회 실패:', error);
        setCurrentUser(null);
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
