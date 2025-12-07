'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  name: z.string().min(2, '이름을 입력해주세요.'),
  phone: z.string().regex(/^010-\d{4}-\d{4}$/, '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)'),
  agreed: z.literal(true, {
    errorMap: () => ({ message: '개인정보 수집 및 이용에 동의해주세요.' }),
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function WaitlistPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      agreed: undefined,
    },
  });

  // 전화번호 자동 포맷팅
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;
    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    setValue('phone', formatted);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const db = getDb();
      const waitlistRef = collection(db, 'waitlist');

      // 중복 체크 (전화번호 기준)
      const q = query(waitlistRef, where('phone', '==', data.phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setIsSubmitted(true); // 이미 신청한 경우도 성공 화면으로 이동 (사용자 경험 고려)
        return;
      }

      // 데이터 저장
      await addDoc(waitlistRef, {
        name: data.name,
        phone: data.phone,
        agreed: true,
        createdAt: serverTimestamp(),
        userAgent: window.navigator.userAgent,
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error('Waitlist submission error:', error);
      toast({
        title: '신청 실패',
        description: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-gray-800 bg-gray-900 text-white">
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">알림 신청이 완료되었습니다!</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              6기 모집이 시작되면<br />
              입력하신 번호로 가장 먼저 알려드리겠습니다.
            </p>
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-white text-black hover:bg-gray-200 font-medium h-12 text-lg"
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* 헤더 / 뒤로가기 */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            뒤로가기
          </button>
          
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-white">안녕하세요, 필립앤소피입니다.</h1>
            <div className="text-gray-300 leading-relaxed space-y-1">
              <p><span className="text-white font-semibold">12/22(월)</span>부터</p>
              <p>6기 모집이 공식적으로 시작됩니다.</p>
              <div className="h-2" />
              <p>성함과 연락처를 남겨주시면,</p>
              <p>모집 시작일(12/22)에</p>
              <p><span className="text-green-400 font-semibold">최우선적으로</span> 알려드리겠습니다.</p>
            </div>
          </div>
        </div>

        {/* 입력 폼 */}
        <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg text-white">사전 알림 신청</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">성함</Label>
                <Input
                  id="name"
                  {...register('name')}
                  className="bg-gray-800 border-gray-700 text-white h-12 focus:ring-gray-500 focus:border-gray-500 placeholder:text-gray-600"
                  placeholder="홍길동"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">연락처</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  onChange={handlePhoneChange}
                  className="bg-gray-800 border-gray-700 text-white h-12 focus:ring-gray-500 focus:border-gray-500 placeholder:text-gray-600"
                  placeholder="010-0000-0000"
                  maxLength={13}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="pt-2">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreed"
                    className="mt-1 border-gray-500 data-[state=checked]:bg-white data-[state=checked]:text-black"
                    onCheckedChange={(checked) => setValue('agreed', checked === true ? true : undefined, { shouldValidate: true })}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="agreed"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300"
                    >
                      개인정보 수집 및 이용 동의 (필수)
                    </Label>
                    <p className="text-xs text-gray-500 leading-normal">
                      수집된 정보(이름, 전화번호)는 6기 모집 알림 발송 목적으로만 사용되며, 모집 종료 후 파기됩니다.
                    </p>
                    {errors.agreed && (
                      <p className="text-sm text-red-500 mt-1">{errors.agreed.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-gray-200 font-bold h-12 text-lg mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '알림 신청하기'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
