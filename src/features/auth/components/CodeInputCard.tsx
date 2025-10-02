'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useParticipantByPhone } from '@/hooks/use-participants';
import { useRouter } from 'next/navigation';
import { useState, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';

export default function CodeInputCard() {
  const router = useRouter();
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
    if (searchPhone && !isLoading && participant === null) {
      setError('등록되지 않은 번호입니다. 다시 확인해주세요.');
      setSearchPhone('');
      setIsSubmitting(false);
    } else if (searchPhone && !isLoading && participant) {
      router.push(`/chat?cohort=${participant.cohortId}&userId=${participant.id}`);
    }
  }, [searchPhone, isLoading, participant, router]);

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
        <Button
          onClick={() => handleSubmit()}
          className="w-full"
          size="lg"
          disabled={!isComplete || isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? '확인 중...' : '입장하기'}
        </Button>
      </CardFooter>
    </Card>
  );
}
