'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import { getTodayString, getYesterdayString } from '@/lib/date-utils';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { MATCHING_CONFIG } from '@/constants/matching';
import { CARD_STYLES } from '@/constants/ui';
import { logger } from '@/lib/logger';
import { getAdminHeaders } from '@/lib/auth-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdminMode } from '@/contexts/ViewModeContext';
import { useYesterdaySubmissionCount } from '@/hooks/use-yesterday-submission-count';
import { useTodaySubmissionCount } from '@/hooks/use-today-submission-count';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import HeaderNavigation from '@/components/HeaderNavigation';
import ParticipantAssignmentTable from '@/components/admin/ParticipantAssignmentTable';
import { useToast } from '@/hooks/use-toast';
import { useParticipantsByCohortRealtime } from '@/hooks/use-participants-realtime';
import type { Participant } from '@/types/database';
import type {
  MatchingResponse,
  AssignmentRow,
  MatchingTarget,
} from '@/types/matching';
import { appRoutes } from '@/lib/navigation';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';

// localStorage 상수 (컴포넌트 외부 정의로 안정성 보장)
const STORAGE_VERSION = '1.0';
const STORAGE_TTL = 24 * 60 * 60 * 1000; // 24시간

function MatchingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const { participant, isLoading: sessionLoading } = useAuth();
  const isAdminMode = useIsAdminMode();
  const { toast } = useToast();
  const { data: cohortParticipants = [], isLoading: participantsLoading, isFromCache } = useParticipantsByCohortRealtime(cohortId || undefined);

  // 실시간 제출 카운트 (Firebase onSnapshot)
  const { count: yesterdayCount, isLoading: isLoadingYesterday } = useYesterdaySubmissionCount(cohortId || undefined);
  const { count: todayCount, isLoading: isLoadingToday } = useTodaySubmissionCount(cohortId || undefined);

  // 매칭 상태 관리: idle | previewing | confirmed
  const [matchingState, setMatchingState] = useState<'idle' | 'previewing' | 'confirmed'>('idle');
  const [hasFetchedInitialResult, setHasFetchedInitialResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<MatchingResponse | null>(null);
  const [confirmedResult, setConfirmedResult] = useState<MatchingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 날짜 정의 (useMemo로 메모이제이션 - 불필요한 재계산 방지)
  const submissionDate = useMemo(() => getYesterdayString(), []); // 제출 날짜 (어제 제출 데이터 조회용)
  const submissionQuestion = useMemo(() => getDailyQuestionText(submissionDate), [submissionDate]);

  // 오늘 날짜 (Firestore 매칭 키 & localStorage 키로 사용)
  const todayDate = useMemo(() => getTodayString(), []); // KST 기준 오늘 날짜
  const todayQuestion = useMemo(() => getDailyQuestionText(todayDate), [todayDate]);

  // 로컬 스토리지 키 (todayDate 기준 - Firestore 키와 일치)
  const PREVIEW_STORAGE_KEY = `matching-preview-${cohortId}-${todayDate}`;
  const CONFIRMED_STORAGE_KEY = `matching-confirmed-${cohortId}-${todayDate}`;
  const IN_PROGRESS_KEY = `matching-in-progress-${cohortId}-${todayDate}`;

  // localStorage 데이터 검증 및 안전한 로드
  const loadFromStorage = useCallback((key: string): MatchingResponse | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // 버전 체크
      if (parsed.version && parsed.version !== STORAGE_VERSION) {
        logger.warn('Outdated localStorage schema, clearing', { key });
        localStorage.removeItem(key);
        return null;
      }

      // TTL 체크 (타임스탬프가 있는 경우)
      if (parsed.timestamp && Date.now() - parsed.timestamp > STORAGE_TTL) {
        logger.warn('Expired localStorage data, clearing', { key });
        localStorage.removeItem(key);
        return null;
      }

      // 데이터 구조 검증 (data 필드 또는 직접 MatchingResponse 형태)
      const data = parsed.data || parsed;
      if (!data.matching || !data.date) {
        logger.error('Invalid localStorage data structure', { key });
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('localStorage parsing error', { key, error });
      // 손상된 데이터 제거
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore removal errors
      }
      return null;
    }
  }, []); // 상수만 사용하므로 dependency 불필요

  const saveToStorage = useCallback((key: string, data: MatchingResponse) => {
    try {
      const stored = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (error) {
      logger.error('localStorage save error', { key, error });
    }
  }, []); // 상수만 사용하므로 dependency 불필요

  // ✅ 날짜/코호트 변경 시 상태 초기화 (전날 데이터 제거)
  useEffect(() => {
    // 1. 상태 초기화
    setMatchingState('idle');
    setPreviewResult(null);
    setConfirmedResult(null);
    setHasFetchedInitialResult(false);
    setError(null);

    // 2. 전날 localStorage 캐시 제거
    try {
      // 현재 날짜 키와 다른 모든 매칭 관련 키 제거
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        // 이 코호트의 매칭 관련 키이지만 오늘 날짜가 아닌 경우 삭제
        if (key.startsWith(`matching-preview-${cohortId}-`) && !key.includes(todayDate)) {
          localStorage.removeItem(key);
          logger.info('전날 프리뷰 캐시 삭제', { key });
        }
        if (key.startsWith(`matching-confirmed-${cohortId}-`) && !key.includes(todayDate)) {
          localStorage.removeItem(key);
          logger.info('전날 확정 캐시 삭제', { key });
        }
        if (key.startsWith(`matching-in-progress-${cohortId}-`) && !key.includes(todayDate)) {
          localStorage.removeItem(key);
          logger.info('전날 진행중 플래그 삭제', { key });
        }
      });
    } catch (storageError) {
      logger.error('localStorage 정리 실패', storageError);
    }

    logger.info('매칭 페이지 상태 초기화', { cohortId, submissionDate, todayDate });
  }, [cohortId, submissionDate, todayDate, PREVIEW_STORAGE_KEY, CONFIRMED_STORAGE_KEY, IN_PROGRESS_KEY]);

  // ✅ Solution 3: localStorage 체크를 동기로 처리하여 초기 렌더링 블로킹 제거
  useEffect(() => {
    if (typeof window === 'undefined' || !cohortId) return;

    // 1. 중단된 매칭 작업 감지 (동기 처리)
    try {
      const interruptedJob = localStorage.getItem(IN_PROGRESS_KEY);
      if (interruptedJob) {
        const timestamp = parseInt(interruptedJob, 10);
        const elapsedMinutes = Math.floor((Date.now() - timestamp) / 1000 / 60);

        toast({
          title: '중단된 매칭 작업 감지',
          description: `${elapsedMinutes}분 전 시작된 매칭이 완료되지 않았습니다. 다시 시도하시겠습니까?`,
          variant: 'default',
        });

        localStorage.removeItem(IN_PROGRESS_KEY);
        logger.warn('중단된 매칭 작업 감지', { timestamp, elapsedMinutes });
      }

      // 2. 로컬 스토리지 복원 우선 (동기, 즉시 표시)

      // ✅ 2-A. 확정 결과 복원 (최우선)
      const savedConfirmed = loadFromStorage(CONFIRMED_STORAGE_KEY);
      if (savedConfirmed) {
        if (savedConfirmed.date === todayDate) {
          setConfirmedResult(savedConfirmed);
          setMatchingState('confirmed');
          return; // 확정 결과가 있으면 프리뷰는 무시
        }

        logger.info('Stale confirmed result ignored', {
          storedDate: savedConfirmed.date,
          todayDate,
        });
      }

      // ✅ 2-B. 프리뷰 결과 복원 (확정 결과가 없을 때만)
      const savedPreview = loadFromStorage(PREVIEW_STORAGE_KEY);
      if (savedPreview) {
        if (savedPreview.date === todayDate) {
          setPreviewResult(savedPreview);
          setMatchingState('previewing');
        } else {
          logger.info('Stale preview result ignored', {
            storedDate: savedPreview.date,
            todayDate,
          });
        }
      }
    } catch (error) {
      logger.error('localStorage 처리 실패', error);
    }

    // 3. Firestore에서 확정된 매칭 또는 프리뷰 조회 (비동기, UI 블로킹 안 함)
    const loadFirestoreData = async () => {
      try {
        const { getDb } = await import('@/lib/firebase');
        const { collection, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc } = await import('firebase/firestore');

        const db = getDb();

        // 3-A. cohorts 문서에서 확정된 매칭 확인
        const cohortRef = doc(db, 'cohorts', cohortId);
        const cohortSnap = await getDoc(cohortRef);

        if (cohortSnap.exists()) {
          const cohortData = cohortSnap.data();
          const dailyFeatured = cohortData.dailyFeaturedParticipants || {};
          const todayMatching = dailyFeatured[todayDate]; // ✅ 발행일(오늘) 키로 조회

          if (todayMatching?.assignments) {
            // 확정된 매칭이 DB에 있음
            const confirmedFromDb: MatchingResponse = {
              success: true,
              date: todayDate, // ✅ 발행일(오늘)로 저장
              question: todayMatching.question || getDailyQuestionText(submissionDate),
              totalParticipants: Object.keys(todayMatching.assignments).length,
              matching: {
                assignments: todayMatching.assignments,
              },
              submissionStats: todayMatching.submissionStats || {
                totalSubmissions: 0,
                processedSubmissions: 0,
              },
            };

            setConfirmedResult(confirmedFromDb);
            setMatchingState('confirmed');
            saveToStorage(CONFIRMED_STORAGE_KEY, confirmedFromDb);

            logger.info('✅ DB에서 확정된 매칭 로드 완료', { date: todayDate, count: confirmedFromDb.totalParticipants });
            return; // 확정 매칭이 있으면 프리뷰는 확인 안 함
          }
        }

        // 3-B. 확정 매칭이 없으면 matching_previews에서 pending 프리뷰 확인
        const previewsRef = collection(db, 'matching_previews');
        const q = query(
          previewsRef,
          where('cohortId', '==', cohortId),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          let latestPreview: MatchingResponse | null = null;

          for (const previewDoc of snapshot.docs) {
            const data = previewDoc.data();

            if (data.date !== todayDate) {
              try {
                await updateDoc(previewDoc.ref, { status: 'expired' });
                logger.info('Stale preview marked as expired', {
                  staleDate: data.date,
                  todayDate,
                });
              } catch (updateError) {
                logger.warn('Failed to expire stale preview', {
                  staleDate: data.date,
                  error: updateError,
                });
              }
              continue;
            }

            latestPreview = {
              success: true,
              date: data.date,
              question: data.question,
              totalParticipants: data.totalParticipants,
              matching: data.matching,
              submissionStats: data.submissionStats,
            };
            break;
          }

          if (latestPreview) {
            setPreviewResult(latestPreview);
            setMatchingState('previewing');
            saveToStorage(PREVIEW_STORAGE_KEY, latestPreview);

            toast({
              title: '🤖 자동 분석 완료',
              description: `AI가 ${latestPreview.totalParticipants}명의 답변을 분석했어요!`,
            });
          }
        }
      } catch (error) {
        // Firestore 조회 실패는 무시 (localStorage 데이터가 이미 표시됨)
        logger.debug('Firestore 데이터 조회 실패 (무시)', error);
      }
    };

    loadFirestoreData();
  }, [cohortId, submissionDate, todayDate, PREVIEW_STORAGE_KEY, CONFIRMED_STORAGE_KEY, IN_PROGRESS_KEY, loadFromStorage, saveToStorage, toast]);

  // beforeunload 경고: AI 매칭 처리 중 페이지 이탈 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = ''; // 브라우저 기본 경고 메시지 표시
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing]);

  const participantsById = useMemo(() => {
    const map = new Map<string, Participant>();
    cohortParticipants.forEach((participant) => {
      map.set(participant.id, participant);
    });
    return map;
  }, [cohortParticipants]);

  const assignmentRows = useMemo<AssignmentRow[]>(() => {
    // 프리뷰 또는 확인된 결과 중 하나 사용
    const currentResult = previewResult || confirmedResult;
    if (!currentResult?.matching.assignments) return [];

    return cohortParticipants
      .filter((participant) => {
        // 슈퍼 관리자만 제외 (일반 관리자는 매칭 대상 포함)
        if (participant.isSuperAdmin) return false;

        // 매칭 결과가 있는 참가자만 포함 (어제 제출한 사람만)
        const assignment = currentResult.matching.assignments?.[participant.id];
        return assignment && (assignment.similar?.length > 0 || assignment.opposite?.length > 0);
      })
      .map((participant) => {
        const assignment = currentResult.matching.assignments?.[participant.id];
        const similarTargets = assignment?.similar ?? [];
        const oppositeTargets = assignment?.opposite ?? [];

        // 삭제된 참가자 ID 감지 및 로깅
        const invalidSimilarIds = similarTargets.filter(id => !participantsById.has(id));
        const invalidOppositeIds = oppositeTargets.filter(id => !participantsById.has(id));
        if (invalidSimilarIds.length > 0 || invalidOppositeIds.length > 0) {
          logger.warn('매칭 결과에 존재하지 않는 참가자 ID 발견', {
            viewerId: participant.id,
            viewerName: participant.name,
            invalidSimilarIds,
            invalidOppositeIds,
          });
        }

        return {
          viewerId: participant.id,
          viewerName: participant.name,
          similarTargets: similarTargets
            .filter((id) => participantsById.has(id))
            .map((id) => {
              const target = participantsById.get(id)!;
              return {
                id,
                name: target.name,
              };
            }),
          oppositeTargets: oppositeTargets
            .filter((id) => participantsById.has(id))
            .map((id) => {
              const target = participantsById.get(id)!;
              return {
                id,
                name: target.name,
              };
            }),
          reasons: assignment?.reasons ?? null,
        };
      });
  }, [previewResult, confirmedResult, cohortParticipants, participantsById]);

  // 권한 체크
  useEffect(() => {
    if (!sessionLoading) {
      if (!participant) {
        router.replace('/app');
        return;
      }
      // 🔒 관리자 모드 체크
      if (!isAdminMode) {
        toast({
          title: '접근 권한 없음',
          description: '관리자 모드에서만 접근할 수 있는 페이지입니다.',
          variant: 'destructive',
        });
        router.replace(`/app/chat?cohort=${cohortId}`);
        return;
      }
      if (!cohortId) {
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, participant, cohortId, router, toast, isAdminMode]);

  // 기존 매칭 결과 로드 (오늘 날짜 기준 - Firestore에 저장된 키)
  const fetchMatchingResult = useCallback(async () => {
    if (!cohortId || hasFetchedInitialResult) return;

    // 🔒 Race condition 방지: 함수 호출 즉시 플래그 설정
    setHasFetchedInitialResult(true);

    try {
      const headers = await getAdminHeaders();
      if (!headers) {
        logger.error('인증 실패: ID Token을 가져올 수 없습니다.');
        return;
      }

      const response = await fetch(
        `/api/admin/matching?cohortId=${cohortId}&date=${todayDate}`,
        { headers }
      );

      // ℹ️ 404는 정상 응답 - 아직 매칭을 실행하지 않았을 때
      if (response.status === 404) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setConfirmedResult(data);
        setMatchingState('confirmed');
      }
    } catch (error) {
      logger.error('매칭 결과 로드 실패', error);
    }
  }, [cohortId, todayDate, hasFetchedInitialResult]);

  // ✅ 확정 결과가 localStorage에 없을 때만 API 호출
  useEffect(() => {
    if (cohortId && matchingState !== 'confirmed') {
      fetchMatchingResult();
    }
  }, [cohortId, fetchMatchingResult, matchingState]);

  const handleOpenProfile = (participantId: string, theme: 'similar' | 'opposite') => {
    if (!cohortId) return;
    // 제출 날짜(어제)를 URL에 포함하여 스포일러 방지 (오늘 제출분은 아직 안 보이도록)
    const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&submissionDate=${encodeURIComponent(submissionDate)}`;
    router.push(profileUrl);
  };

  // 1단계: AI 매칭 프리뷰 (저장하지 않음)
  const handleStartMatching = async () => {
    // Race condition 방지: 이미 처리중이면 중복 실행 차단
    if (isProcessing) return;

    if (!cohortId) return;

    setIsProcessing(true);
    setError(null);

    // 중단 감지용 플래그 설정 (AI 처리 시작 시점 기록)
    try {
      localStorage.setItem(IN_PROGRESS_KEY, Date.now().toString());
      logger.info('매칭 작업 시작 플래그 설정', { submissionDate });
    } catch (storageError) {
      logger.error('로컬 스토리지 플래그 설정 실패', storageError);
    }

    try {
      const headers = await getAdminHeaders();
      if (!headers) {
        throw new Error('인증 실패: 로그인 상태를 확인해주세요.');
      }

      const response = await fetch('/api/admin/matching/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cohortId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '매칭 실행 실패');
      }

      setPreviewResult(data);
      setMatchingState('previewing');

      // 로컬 스토리지에 프리뷰 결과 저장
      try {
        saveToStorage(PREVIEW_STORAGE_KEY, data);
        logger.info('프리뷰 결과 로컬 스토리지 저장 완료', { submissionDate });
      } catch (storageError) {
        logger.error('로컬 스토리지 저장 실패', storageError);
      }

      const matchedCount =
        data.totalParticipants ??
        (data.matching?.assignments
          ? Object.keys(data.matching.assignments).length
          : 0);

      toast({
        title: 'AI 매칭 완료',
        description: `${matchedCount}명의 참가자 매칭 결과를 확인하세요.`,
      });

      // 성공 시 중단 플래그 제거
      try {
        localStorage.removeItem(IN_PROGRESS_KEY);
        logger.info('매칭 작업 완료, 플래그 제거', { submissionDate });
      } catch (storageError) {
        logger.error('로컬 스토리지 플래그 제거 실패', storageError);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '매칭 실행 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast({
        title: '매칭 실패',
        description: errorMessage,
        variant: 'destructive',
      });

      // 실패 시에도 중단 플래그 제거 (재시도 가능하도록)
      try {
        localStorage.removeItem(IN_PROGRESS_KEY);
        logger.info('매칭 작업 실패, 플래그 제거', { submissionDate });
      } catch (storageError) {
        logger.error('로컬 스토리지 플래그 제거 실패', storageError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 2단계: 매칭 결과 최종 확인 및 저장
  const handleConfirmMatching = async () => {
    if (!cohortId || !previewResult) return;

    setIsProcessing(true);
    setError(null);

    try {
      const headers = await getAdminHeaders();
      if (!headers) {
        throw new Error('인증 실패: 로그인 상태를 확인해주세요.');
      }

      const response = await fetch('/api/admin/matching/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cohortId,
          matching: previewResult.matching,
          date: previewResult.date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '매칭 저장 실패');
      }

      // 프리뷰 결과를 확인된 결과로 이동
      setConfirmedResult(previewResult);
      setPreviewResult(null);
      setMatchingState('confirmed');

      // 로컬 스토리지 업데이트 (프리뷰 삭제, 확정 저장)
      try {
        localStorage.removeItem(PREVIEW_STORAGE_KEY); // 프리뷰는 삭제
        localStorage.setItem(CONFIRMED_STORAGE_KEY, JSON.stringify(previewResult)); // 확정 결과 저장
        logger.info('확정 결과 로컬 스토리지 저장 완료', { submissionDate });
      } catch (storageError) {
        logger.error('로컬 스토리지 저장 실패', storageError);
      }

      // Firestore matching_previews 상태 업데이트 (자동 생성된 preview가 있다면)
      try {
        const { getDb } = await import('@/lib/firebase');
        const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');

        const db = getDb();
        const previewsRef = collection(db, 'matching_previews');
        const q = query(
          previewsRef,
          where('cohortId', '==', cohortId),
          where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // pending 상태의 preview를 confirmed로 변경
          const updatePromises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { status: 'confirmed' })
          );
          await Promise.all(updatePromises);
          logger.info('Firestore matching_previews 상태 업데이트 완료', {
            count: snapshot.size,
            date: submissionDate
          });
        }
      } catch (firestoreError) {
        // Firestore 업데이트 실패는 로그만 남기고 계속 진행
        logger.error('Firestore matching_previews 업데이트 실패', firestoreError);
      }

      toast({
        title: '매칭 적용 완료',
        description: '오늘의 서재에서 참가자들이 확인할 수 있습니다.',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '매칭 저장 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast({
        title: '저장 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 로딩 중
  if (sessionLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderNavigation title="매칭 관리" />
          <main className="app-main-content flex-1 flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </PageTransition>
    );
  }

  // 관리자 모드가 아니거나 cohortId가 없으면 접근 불가
  if (!isAdminMode || !cohortId) {
    return null;
  }

  const canMatch = yesterdayCount >= MATCHING_CONFIG.MIN_SUBMISSIONS_FOR_MATCHING;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation
          title="AI 매칭 관리"
          showBackButton
          onBackClick={() => router.push(`/app/chat?cohort=${cohortId}`)}
        />

        <main className="app-main-content flex-1 overflow-y-auto bg-admin-bg-page">
          <div className="mx-auto max-w-md px-4 py-6 space-y-4">
            {/* 1. 오늘의 인증 현황 */}
            <div className={CARD_STYLES.CONTAINER}>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-admin-text-primary">오늘의 인증 현황</h3>
                    <p className="text-xs text-admin-text-secondary">{todayDate}</p>
                  </div>
                  <span className="text-2xl font-bold text-admin-brand">
                    {isLoadingToday ? '...' : `${todayCount}명`}
                  </span>
                </div>
                <p className="text-xs text-admin-text-secondary">내일 매칭 예정</p>
              </div>
            </div>

            {/* 2. 프로필 북 전달 대상 */}
            <div className={CARD_STYLES.CONTAINER}>
              <div className="p-4 space-y-3">
                {/* 헤더: 제목 + 숫자 + 상태 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-admin-text-primary">프로필 북 전달 대상</h3>
                    <p className="text-xs text-admin-text-secondary">{submissionDate}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-admin-brand">
                      {isLoadingYesterday ? '...' : `${yesterdayCount}명`}
                    </span>
                    {/* 상태 배지 */}
                    <div className="mt-1">
                      {matchingState === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-admin-brand-success">
                          <Check className="h-3 w-3" />
                          전달 완료
                        </span>
                      ) : matchingState === 'previewing' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-admin-brand-warning">
                          <Loader2 className="h-3 w-3" />
                          확인 대기중
                        </span>
                      ) : canMatch ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-admin-brand">
                          <Check className="h-3 w-3" />
                          매칭 가능
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-admin-text-secondary">
                          <X className="h-3 w-3" />
                          불가능
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="pt-1">
                  {matchingState === 'idle' && (
                    <UnifiedButton
                      variant="primary"
                      onClick={handleStartMatching}
                      disabled={!canMatch || isProcessing}
                      icon={
                        isProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : undefined
                      }
                      className="w-full"
                    >
                      {isProcessing ? 'AI 분석 중...' : '매칭 시작하기'}
                    </UnifiedButton>
                  )}

                  {matchingState === 'previewing' && (
                    <div className="space-y-2">
                      <UnifiedButton
                        variant="primary"
                        fullWidth
                        onClick={handleConfirmMatching}
                        disabled={isProcessing}
                        icon={
                          isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )
                        }
                      >
                        {isProcessing ? '저장 중...' : '최종 확인 및 적용'}
                      </UnifiedButton>
                      <UnifiedButton
                        variant="outline"
                        fullWidth
                        onClick={handleStartMatching}
                        disabled={!canMatch || isProcessing}
                        icon={
                          isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : undefined
                        }
                      >
                        {isProcessing ? 'AI 분석 중...' : '다시 매칭하기'}
                      </UnifiedButton>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-xl p-4 border bg-admin-bg-warning border-admin-border-warning">
                <p className="text-sm text-admin-text-tertiary">{error}</p>
              </div>
            )}

            {/* 3. 프로필북 현황 (항상 표시) */}
            <ParticipantAssignmentTable
              assignmentRows={assignmentRows}
              participantsLoading={participantsLoading}
              onOpenProfile={handleOpenProfile}
              matchingState={matchingState}
            />

            {/* 안내 메시지 */}
            <div className="rounded-xl p-4 border bg-admin-bg-info border-admin-border">
              <p className="text-xs leading-relaxed text-admin-text-tertiary">
                <strong className="text-admin-text-primary">매칭 운영 가이드</strong>
                <br />• 최소 4명의 참가자가 오늘의 질문에 답변해야 AI 매칭을 실행할 수 있습니다.
                <br />• AI는 참가자들의 답변을 분석해 오늘 공개할 프로필북 4개(유사 2, 반대 2)를 선정합니다.
                <br />• 선정된 프로필북은 오늘의 서재에 자동 게시되며, 필요 시 이 페이지에서 재매칭할 수 있습니다.
              </p>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

export default function MatchingPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex items-center justify-center bg-[#eff6ff]">
          <Loader2 className="h-8 w-8 animate-spin text-[#45a1fd]" />
        </div>
      }
    >
      <MatchingPageContent />
    </Suspense>
  );
}
