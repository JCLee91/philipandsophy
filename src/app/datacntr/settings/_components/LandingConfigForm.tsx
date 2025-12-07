'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { getLandingConfig, updateLandingConfig } from '@/lib/firebase/landing';
import { LandingConfig } from '@/types/landing';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  cohortNumber: z.coerce.number().min(1, '기수는 1 이상이어야 합니다.'),
  status: z.enum(['OPEN', 'CLOSED']),
  openFormType: z.enum(['INTERNAL', 'EXTERNAL']),
  closedFormType: z.enum(['EXTERNAL_WAITLIST', 'INTERNAL_WAITLIST', 'NONE']),
  ctaText: z.string().min(1, 'CTA 텍스트를 입력해주세요.'),
  floatingText: z.string().min(1, '툴팁 텍스트를 입력해주세요.'),
  externalUrl: z.string().optional(),
  schedule: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function LandingConfigForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cohortNumber: 5,
      status: 'OPEN',
      openFormType: 'INTERNAL',
      closedFormType: 'EXTERNAL_WAITLIST',
      ctaText: '',
      floatingText: '',
      externalUrl: '',
      schedule: '',
    },
  });

  const status = watch('status');
  const openFormType = watch('openFormType');
  const closedFormType = watch('closedFormType');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getLandingConfig();
        setValue('cohortNumber', config.cohortNumber);
        setValue('status', config.status);
        setValue('openFormType', config.openFormType || 'INTERNAL');
        setValue('closedFormType', config.closedFormType || 'EXTERNAL_WAITLIST');
        setValue('ctaText', config.ctaText);
        setValue('floatingText', config.floatingText);
        setValue('externalUrl', config.externalUrl || '');
        setValue('schedule', config.schedule || '');
      } catch (error) {
        toast({
          title: '설정 로드 실패',
          description: '랜딩 페이지 설정을 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [setValue, toast]);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await updateLandingConfig(
        {
          ...data,
          applicationUrl: '/application', // 항상 고정
          externalUrl: data.externalUrl || '',
          schedule: data.schedule || '',
          // 하위 호환성 유지 (Deprecated)
          waitlistUrl: data.externalUrl || '',
        },
        user?.email || undefined
      );
      toast({
        title: '설정 저장 완료',
        description: '랜딩 페이지 설정이 성공적으로 업데이트되었습니다.',
      });
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '설정을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>랜딩 페이지 설정</CardTitle>
        <CardDescription>
          모집 상태에 따라 신청 폼 또는 대기 폼을 선택하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* 1. 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cohortNumber">모집 기수</Label>
              <Input
                id="cohortNumber"
                type="number"
                {...register('cohortNumber')}
                placeholder="예: 5"
              />
              {errors.cohortNumber && (
                <p className="text-sm text-red-500">{errors.cohortNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule">모집 일정 (선택)</Label>
              <Input
                id="schedule"
                {...register('schedule')}
                placeholder="예: 2024.03.01 ~ 2024.03.14"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* 2. 모집 상태 선택 */}
          <div className="space-y-4">
            <Label className="text-base">현재 상태</Label>
            <RadioGroup
              value={status}
              onValueChange={(value) => setValue('status', value as 'OPEN' | 'CLOSED')}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="OPEN" id="status-open" className="peer sr-only" />
                <Label
                  htmlFor="status-open"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-green-50 cursor-pointer"
                >
                  <span className="text-xl mb-1">🟢 모집 중</span>
                  <span className="text-sm text-muted-foreground">신청을 받습니다</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="CLOSED" id="status-closed" className="peer sr-only" />
                <Label
                  htmlFor="status-closed"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-red-50 cursor-pointer"
                >
                  <span className="text-xl mb-1">🔴 마감</span>
                  <span className="text-sm text-muted-foreground">대기 신청을 받습니다</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 3. 상태별 세부 설정 (조건부 렌더링) */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-6">
            {status === 'OPEN' ? (
              // 🟢 모집 중일 때 설정
              <>
                <div className="space-y-3">
                  <Label>신청 방식 선택</Label>
                  <RadioGroup
                    value={openFormType}
                    onValueChange={(value) => setValue('openFormType', value as 'INTERNAL' | 'EXTERNAL')}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="INTERNAL" id="open-internal" />
                      <Label htmlFor="open-internal" className="font-normal cursor-pointer">
                        자체 신청 폼 사용 (기본값)
                        <span className="block text-xs text-gray-500 mt-0.5">
                          온보딩 영상 시청 후 /application 페이지 내 자체 폼으로 연결됩니다.
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="EXTERNAL" id="open-external" />
                      <Label htmlFor="open-external" className="font-normal cursor-pointer">
                        외부 링크 사용
                        <span className="block text-xs text-gray-500 mt-0.5">
                          Tally, Google Form 등 외부 링크로 새 탭에서 이동합니다.
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {openFormType === 'EXTERNAL' && (
                  <div className="space-y-2 pl-6 border-l-2 border-slate-300">
                    <Label htmlFor="externalUrl">외부 신청 폼 URL</Label>
                    <Input
                      id="externalUrl"
                      {...register('externalUrl')}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </>
            ) : (
              // 🔴 마감일 때 설정
              <>
                <div className="space-y-3">
                  <Label>마감 후 처리 방식</Label>
                  <RadioGroup
                    value={closedFormType}
                    onValueChange={(value) => setValue('closedFormType', value as 'EXTERNAL_WAITLIST' | 'INTERNAL_WAITLIST' | 'NONE')}
                    className="flex flex-col space-y-2"
                  >
                    {/* 1. 외부 폼 */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="EXTERNAL_WAITLIST" id="closed-waitlist" />
                      <Label htmlFor="closed-waitlist" className="font-normal cursor-pointer">
                        외부 대기 폼 사용
                        <span className="block text-xs text-gray-500 mt-0.5">
                          Tally 등 외부 폼으로 이동하여 알림 신청을 받습니다.
                        </span>
                      </Label>
                    </div>

                    {/* 2. 자체 폼 (NEW) */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="INTERNAL_WAITLIST" id="closed-internal-waitlist" />
                      <Label htmlFor="closed-internal-waitlist" className="font-normal cursor-pointer">
                        자체 대기 폼 사용 (추천)
                        <span className="block text-xs text-gray-500 mt-0.5">
                          별도 설정 없이 /waitlist 페이지로 연결되어 대기자를 수집합니다.
                        </span>
                      </Label>
                    </div>

                    {/* 3. 사용 안 함 */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NONE" id="closed-none" />
                      <Label htmlFor="closed-none" className="font-normal cursor-pointer">
                        대기 받지 않음
                        <span className="block text-xs text-gray-500 mt-0.5">
                          단순 마감 상태로 표시하며, 버튼 클릭 시 아무 동작도 하지 않습니다.
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {closedFormType === 'EXTERNAL_WAITLIST' && (
                  <div className="space-y-2 pl-6 border-l-2 border-slate-300">
                    <Label htmlFor="externalUrl">외부 대기 폼 URL</Label>
                    <Input
                      id="externalUrl"
                      {...register('externalUrl')}
                      placeholder="https://tally.so/..."
                    />
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              <div className="space-y-2">
                <Label htmlFor="ctaText">버튼 텍스트</Label>
                <Input
                  id="ctaText"
                  {...register('ctaText')}
                  placeholder={status === 'OPEN' ? "예: 5기 참여하기" : "예: 다음 기수 알림 신청"}
                />
                {errors.ctaText && (
                  <p className="text-sm text-red-500">{errors.ctaText.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="floatingText">툴팁 텍스트 (플로팅)</Label>
                <Input
                  id="floatingText"
                  {...register('floatingText')}
                  placeholder={status === 'OPEN' ? "예: 마감 임박!" : "예: 5기는 마감되었어요"}
                />
                {errors.floatingText && (
                  <p className="text-sm text-red-500">{errors.floatingText.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="lg">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!saving && <Save className="mr-2 h-4 w-4" />}
              설정 저장
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
