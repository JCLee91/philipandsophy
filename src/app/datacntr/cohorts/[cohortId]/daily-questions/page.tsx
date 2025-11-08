'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Loader2, ArrowLeft, Save, Copy } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Cohort, DailyQuestion } from '@/types/database';
import FormSelect from '@/components/datacntr/form/FormSelect';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
interface DailyQuestionsPageProps {
  params: Promise<{ cohortId: string }>;
}

const DAILY_QUESTION_CATEGORIES = [
  '취향',
  '라이프스타일',
  '가치관&삶',
  '인간관계',
  '꿈꾸는 미래',
] as const;

export default function DailyQuestionsPage({ params }: DailyQuestionsPageProps) {
  const router = useRouter();
  const { user, isAdministrator, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [cohortId, setCohortId] = useState<string>('');
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Params 추출
  useEffect(() => {
    params.then((p) => setCohortId(p.cohortId));
  }, [params]);

  // 로그인 & 권한 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
    if (!authLoading && !isAdministrator) {
      toast({
        title: '권한 없음',
        description: '관리자만 접근할 수 있습니다.',
        variant: 'destructive',
      });
      router.replace('/datacntr');
    }
  }, [authLoading, user, isAdministrator, router, toast]);

  // 데이터 로드
  useEffect(() => {
    if (!user || !cohortId) return;

    const fetchData = async () => {
      try {
        const idToken = await user.getIdToken();

        // 코호트 정보 가져오기
        const cohortResponse = await fetch(`/api/datacntr/cohorts/${cohortId}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
        });

        if (!cohortResponse.ok) throw new Error('코호트 조회 실패');

        const cohortData = await cohortResponse.json();
        setCohort(cohortData.cohort);

        // Daily Questions 가져오기
        const questionsResponse = await fetch(
          `/api/datacntr/cohorts/${cohortId}/daily-questions`,
          { headers: { 'Authorization': `Bearer ${idToken}` } }
        );

        if (questionsResponse.ok) {
          const questionsData = await questionsResponse.json();
          setQuestions(questionsData);
        } else {
          // 질문이 없으면 빈 템플릿 생성 (Day 2~14, 총 13개)
          if (cohortData.cohort?.programStartDate) {
            const emptyQuestions = Array.from({ length: 13 }, (_, i) => {
              const dayNumber = i + 2; // Day 2부터 시작
              const date = format(
                addDays(parseISO(cohortData.cohort.programStartDate), dayNumber - 1),
                'yyyy-MM-dd'
              );
              return {
                id: dayNumber.toString(),
                dayNumber,
                date,
                category: '__placeholder__',
                question: '',
                order: dayNumber,
                createdAt: null as any,
                updatedAt: null as any,
              };
            });
            setQuestions(emptyQuestions);
          }
        }
      } catch (error) {

        toast({
          title: '오류',
          description: '데이터를 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, cohortId, toast]);

  // 질문 변경
  const handleQuestionChange = (index: number, field: 'category' | 'question', value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  // 1기 질문 복사
  const handleCopyFromCohort1 = async () => {
    try {
      if (!user) return;

      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/cohorts/1/daily-questions', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      if (!response.ok) throw new Error('1기 질문 조회 실패');

      const sourceQuestions = await response.json();

      if (!cohort?.programStartDate) {
        throw new Error('프로그램 시작일이 설정되지 않았습니다');
      }

      // Day 2부터 시작 (Day 1은 OT)
      // 1기의 Day 2~14 질문만 가져오기
      const filteredQuestions = sourceQuestions.filter((q: DailyQuestion) => q.dayNumber >= 2);

      // 날짜 재계산
      const updated = filteredQuestions.map((q: DailyQuestion) => ({
        ...q,
        id: q.dayNumber.toString(),
        date: format(
          addDays(parseISO(cohort.programStartDate), q.dayNumber - 1),
          'yyyy-MM-dd'
        ),
      }));

      setQuestions(updated);
      toast({
        title: '복사 완료',
        description: `1기의 질문 ${updated.length}개를 불러왔습니다.`,
      });
    } catch (error) {

      toast({
        title: '오류',
        description: '질문을 복사하는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 저장
  const handleSave = async () => {
    // 유효성 검사
    const emptyQuestions = questions.filter(
      q => !q.category || q.category === '__placeholder__' || !q.question
    );
    if (emptyQuestions.length > 0) {
      toast({
        title: '유효성 검사 실패',
        description: '모든 질문의 카테고리와 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (!user) throw new Error('인증 실패');

      const idToken = await user.getIdToken();
      const response = await fetch(`/api/datacntr/cohorts/${cohortId}/daily-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ questions }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '저장 실패');
      }

      toast({
        title: '저장 완료',
        description: 'Daily Questions가 저장되었습니다.',
      });
    } catch (error) {

      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '저장에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !isAdministrator) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {cohort?.name} - Daily Questions
            </h1>
            <p className="text-gray-600 mt-1">Day 2~14 질문 관리 (Day 1은 OT)</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleCopyFromCohort1}>
          <Copy className="h-4 w-4 mr-2" />
          1기 복사
        </Button>
      </div>

      {/* 질문 폼 */}
      <div className="space-y-4">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                Day {q.dayNumber} ({format(parseISO(q.date), 'M월 d일 (EEE)', { locale: ko })})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormSelect
                label="카테고리"
                value={q.category || '__placeholder__'}
                onChange={(value) => {
                  if (value !== '__placeholder__') {
                    handleQuestionChange(index, 'category', value);
                  }
                }}
                options={[
                  { value: '__placeholder__', label: '선택하세요' },
                  ...DAILY_QUESTION_CATEGORIES.map((cat) => ({
                    value: cat,
                    label: cat,
                  })),
                ]}
                placeholder="카테고리를 선택하세요"
                className="mt-1"
              />
              <div>
                <Label htmlFor={`question-${q.id}`}>질문</Label>
                <Input
                  id={`question-${q.id}`}
                  value={q.question}
                  onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                  placeholder="오늘의 질문을 입력하세요"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 하단 저장 버튼 */}
      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              저장하기
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
