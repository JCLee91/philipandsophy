'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Loader2, Upload, Download, Plus, X } from 'lucide-react';

type ParticipantRow = {
  name: string;
  phone: string;
  role: 'participant' | 'admin';
};

type QuestionsOption = 'copy' | 'manual' | 'later';

export default function CohortCreatePage() {
  const router = useRouter();
  const { user, isAdministrator, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // 기본 정보
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [programStartDate, setProgramStartDate] = useState('');

  // 참가자 목록
  const [participants, setParticipants] = useState<ParticipantRow[]>([
    { name: '', phone: '', role: 'participant' },
  ]);

  // Daily Questions 옵션
  const [questionsOption, setQuestionsOption] = useState<QuestionsOption>('later');

  // UI 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // 참가자 행 추가
  const handleAddParticipant = () => {
    setParticipants([...participants, { name: '', phone: '', role: 'participant' }]);
  };

  // 참가자 행 제거
  const handleRemoveParticipant = (index: number) => {
    if (participants.length === 1) {
      toast({
        title: '최소 1명 필요',
        description: '최소 1명의 참가자가 필요합니다.',
        variant: 'destructive',
      });
      return;
    }
    setParticipants(participants.filter((_, i) => i !== index));
  };

  // 참가자 정보 변경
  const handleParticipantChange = (
    index: number,
    field: keyof ParticipantRow,
    value: string
  ) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  // CSV 업로드
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        // 헤더 제거
        const dataLines = lines.slice(1);

        const parsed: ParticipantRow[] = dataLines.map(line => {
          const [name, phone, role] = line.split(',').map(s => s.trim());
          return {
            name: name || '',
            phone: phone || '',
            role: (role === 'admin' ? 'admin' : 'participant') as 'participant' | 'admin',
          };
        }).filter(p => p.name && p.phone); // 빈 행 제외

        if (parsed.length === 0) {
          throw new Error('CSV 파일에 유효한 데이터가 없습니다');
        }

        setParticipants(parsed);
        toast({
          title: 'CSV 업로드 완료',
          description: `${parsed.length}명의 참가자를 불러왔습니다.`,
        });
      } catch (error) {
        logger.error('CSV 파싱 실패:', error);
        toast({
          title: '오류',
          description: 'CSV 파일을 읽는데 실패했습니다.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  // CSV 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const template = `이름,핸드폰번호,역할
홍길동,01012345678,participant
김철수,01087654321,participant
이영희,01011112222,admin`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'participants_template.csv';
    link.click();
  };

  // 유효성 검사
  const validate = (): string | null => {
    if (!name.trim()) return '기수명을 입력해주세요';
    if (!startDate) return '시작일을 선택해주세요';
    if (!endDate) return '종료일을 선택해주세요';
    if (!programStartDate) return 'Daily Questions 시작일을 선택해주세요';

    if (new Date(endDate) < new Date(startDate)) {
      return '종료일은 시작일보다 늦어야 합니다';
    }

    // 참가자 검증
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!p.name.trim()) return `${i + 1}번째 참가자의 이름을 입력해주세요`;
      if (!p.phone.trim()) return `${i + 1}번째 참가자의 핸드폰 번호를 입력해주세요`;

      // 핸드폰 번호 형식 검증 (간단하게)
      const cleanPhone = p.phone.replace(/-/g, '');
      if (!/^01\d{8,9}$/.test(cleanPhone)) {
        return `${i + 1}번째 참가자의 핸드폰 번호 형식이 올바르지 않습니다`;
      }
    }

    // 중복 핸드폰 번호 체크
    const phones = participants.map(p => p.phone.replace(/-/g, ''));
    const uniquePhones = new Set(phones);
    if (phones.length !== uniquePhones.size) {
      return '중복된 핸드폰 번호가 있습니다';
    }

    return null;
  };

  // 제출
  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast({
        title: '유효성 검사 실패',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('인증 토큰을 가져올 수 없습니다');

      const response = await fetch('/api/datacntr/cohorts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          programStartDate,
          participants: participants.map(p => ({
            ...p,
            phone: p.phone.replace(/-/g, ''), // 하이픈 제거
          })),
          questionsOption,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '기수 생성 실패');
      }

      toast({
        title: '기수 생성 완료',
        description: `${name}이(가) 생성되었습니다.`,
      });

      router.push('/datacntr/cohorts');

    } catch (error) {
      logger.error('기수 생성 실패:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '기수 생성에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !isAdministrator) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">새 기수 생성</h1>
        <p className="text-gray-600 mt-2">새로운 독서 프로그램 기수를 생성합니다</p>
      </div>

      {/* 기본 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">기수명 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2기"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">시작일 *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">종료일 *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="programStartDate">Daily Questions 시작일 *</Label>
            <Input
              id="programStartDate"
              type="date"
              value={programStartDate}
              onChange={(e) => setProgramStartDate(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              ℹ️ 프로그램 시작일과 동일하게 설정하는 것을 권장합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 참가자 추가 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>참가자 추가</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CSV 업로드 버튼들 */}
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Upload className="h-4 w-4" />
                CSV 업로드
              </div>
            </label>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              템플릿 다운로드
            </button>
          </div>

          {/* 참가자 테이블 */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">이름</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">핸드폰번호</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">역할</th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">
                      <Input
                        value={p.name}
                        onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                        placeholder="홍길동"
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={p.phone}
                        onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                        placeholder="010-1234-5678"
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={p.role}
                        onChange={(e) => handleParticipantChange(index, 'role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="participant">참가자</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleRemoveParticipant(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleAddParticipant}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-gray-600 hover:text-gray-700"
          >
            <Plus className="h-5 w-5 inline mr-2" />
            행 추가
          </button>

          <p className="text-sm text-gray-500">총 {participants.length}명</p>
        </CardContent>
      </Card>

      {/* Daily Questions 설정 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily Questions 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="questions"
              value="copy"
              checked={questionsOption === 'copy'}
              onChange={(e) => setQuestionsOption(e.target.value as QuestionsOption)}
              className="w-4 h-4"
            />
            <span>1기 질문 복사</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="questions"
              value="manual"
              checked={questionsOption === 'manual'}
              onChange={(e) => setQuestionsOption(e.target.value as QuestionsOption)}
              className="w-4 h-4"
            />
            <span>직접 입력 (생성 후 설정)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="questions"
              value="later"
              checked={questionsOption === 'later'}
              onChange={(e) => setQuestionsOption(e.target.value as QuestionsOption)}
              className="w-4 h-4"
            />
            <span>나중에 설정</span>
          </label>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              생성 중...
            </>
          ) : (
            '생성하기'
          )}
        </Button>
      </div>
    </div>
  );
}
