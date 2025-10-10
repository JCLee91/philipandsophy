'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import UnifiedButton from '@/components/UnifiedButton';
import { useParticipantByPhone } from '@/hooks/use-participants';
import { useRouter } from 'next/navigation';
import { useState, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getCohortById, getParticipantsByCohort, getNoticesByCohort, createSessionToken } from '@/lib/firebase';
import { cohortKeys } from '@/hooks/use-cohorts';
import { PARTICIPANT_KEYS } from '@/hooks/use-participants';
import { NOTICE_KEYS } from '@/hooks/use-notices';
import { appRoutes } from '@/lib/navigation';
import { logger } from '@/lib/logger';
import { useSession } from '@/hooks/use-session';

export default function CodeInputCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSessionToken } = useSession();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Firebase query - only triggered when searchPhone is set
  const { data: participant, isLoading } = useParticipantByPhone(searchPhone);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');

    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
    setSearchPhone(''); // Clear search when typing
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      const numbers = phoneNumber.replace(/-/g, '');
      if (numbers.length === 11) {
        handleSubmit(numbers);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numbers = pastedText.replace(/[^\d]/g, '');

    if (numbers.length > 0) {
      const formatted = formatPhoneNumber(numbers);
      setPhoneNumber(formatted);
    }
  };

  const handleSubmit = async (numbers?: string) => {
    const cleanNumber = numbers || phoneNumber.replace(/-/g, '');

    if (cleanNumber.length !== 11) {
      setError('11자리 휴대폰 번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Trigger Firebase query
    setSearchPhone(cleanNumber);
  };

  // Handle Firebase query result
  useEffect(() => {
    if (searchPhone && !isLoading && !participant) {
      setError('등록되지 않은 번호입니다. 다시 확인해주세요.');
      setSearchPhone('');
      setIsSubmitting(false);
    } else if (searchPhone && !isLoading && participant) {
      // 로그인 성공: 세션 토큰 생성 및 저장
      const loginUser = async () => {
        const cohortId = participant.cohortId;

        try {
          // 1. Firebase에 세션 토큰 생성 및 저장
          const sessionToken = await createSessionToken(participant.id);

          // 2. sessionStorage에 토큰 저장
          setSessionToken(sessionToken);

          // 3. Prefetch strategy: 채팅 페이지 진입 전 필요 데이터 미리 로드
          // Prefetch는 best-effort - 실패해도 페이지는 정상 로드됨
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: cohortKeys.detail(cohortId),
              queryFn: () => getCohortById(cohortId),
            }),
            queryClient.prefetchQuery({
              queryKey: PARTICIPANT_KEYS.byCohort(cohortId),
              queryFn: () => getParticipantsByCohort(cohortId),
            }),
            queryClient.prefetchQuery({
              queryKey: NOTICE_KEYS.byCohort(cohortId),
              queryFn: () => getNoticesByCohort(cohortId),
            }),
          ]);
        } catch (error) {
          // Prefetch 실패는 치명적이지 않음 - React Query가 페이지에서 자동 fetch
          logger.warn('Prefetch failed, continuing to page', error);
        } finally {
          // 4. 페이지 이동 (URL에서 userId 제거)
          // router.push 대신 router.replace 사용 → 브라우저 히스토리에 남지 않음
          router.replace(appRoutes.chat(cohortId));
        }
      };

      loginUser();
    }
  }, [searchPhone, isLoading, participant, router, queryClient, setSessionToken]);

  const isComplete = phoneNumber.replace(/-/g, '').length === 11;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          필립앤소피 독서모임
        </CardTitle>
        <CardDescription>
          등록된 휴대폰 번호를 입력해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="010-1234-5678"
            value={phoneNumber}
            maxLength={13}
            className={`text-center text-lg ${
              error ? 'border-destructive' : ''
            }`}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            autoFocus
          />
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <UnifiedButton
          onClick={() => handleSubmit()}
          disabled={!isComplete}
          loading={isSubmitting || isLoading}
          loadingText="확인 중..."
          fullWidth
        >
          입장하기
        </UnifiedButton>
      </CardFooter>
    </Card>
  );
}
