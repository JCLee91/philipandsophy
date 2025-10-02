'use client';

import { useEffect, useState } from 'react';
import { subscribeTodayVerified } from '@/lib/firebase';
import { format } from 'date-fns';

/**
 * 오늘 독서 인증을 완료한 참가자 ID 목록을 실시간으로 추적하는 hook
 * 자정이 되면 자동으로 초기화됨
 */
export function useVerifiedToday() {
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    setIsLoading(true);

    // 실시간 구독 시작
    const unsubscribe = subscribeTodayVerified((ids) => {
      setVerifiedIds(ids);
      setIsLoading(false);
    });

    // 자정 체크 타이머 (날짜가 바뀌면 초기화)
    const midnightCheck = setInterval(() => {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (today !== currentDate) {
        setCurrentDate(today);
        setVerifiedIds(new Set()); // 초기화
        // Firestore 구독은 자동으로 새 날짜 데이터를 받아옴
      }
    }, 60 * 1000); // 1분마다 체크

    return () => {
      unsubscribe();
      clearInterval(midnightCheck);
    };
  }, [currentDate]);

  return { data: verifiedIds, isLoading };
}
