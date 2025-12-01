'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, BarChart3, ChevronRight, Users } from 'lucide-react';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import TableSearch from '@/components/datacntr/table/TableSearch';
import TimeDistributionChart from '@/components/datacntr/dashboard/TimeDistributionChart';
import ParticipationPanel from '@/components/datacntr/dashboard/ParticipationPanel';
import ReviewQualityPanel from '@/components/datacntr/dashboard/ReviewQualityPanel';
import AllBooksPanel from '@/components/datacntr/dashboard/AllBooksPanel';
import SubmissionDetailDialog from '@/components/datacntr/submissions/SubmissionDetailDialog';
import { useDatacntrStore } from '@/stores/datacntr-store';
import type { ReadingSubmission } from '@/types/database';
import type { SubmissionAnalytics } from '@/types/datacntr';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';

interface SubmissionWithParticipant extends ReadingSubmission {
  participantName: string;
  cohortName: string;
}

export default function SubmissionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedCohortId } = useDatacntrStore();
  const [submissions, setSubmissions] = useState<SubmissionWithParticipant[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionWithParticipant[]>([]);
  const [analytics, setAnalytics] = useState<SubmissionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Detail Dialog State
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithParticipant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 인증 데이터 로드 (기수별 필터링)
  useEffect(() => {
    if (!user || !selectedCohortId) return;

    const fetchSubmissions = async () => {
      try {
        setIsLoading(true);
        const idToken = await user.getIdToken();
        const url = `/api/datacntr/submissions?cohortId=${selectedCohortId}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('독서 인증 조회 실패');
        }

        const data = await response.json();
        setSubmissions(data);
        setFilteredSubmissions(data);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [user, selectedCohortId]);

  // 분석 데이터 로드 (기수별 필터링)
  useEffect(() => {
    if (!user || !selectedCohortId) return;

    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const idToken = await user.getIdToken();
        const url = `/api/datacntr/stats/submissions?cohortId=${selectedCohortId}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('독서 인증 분석 조회 실패');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, selectedCohortId]);

  // 검색 필터링 (가치관 답변 포함)
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSubmissions(submissions);
      return;
    }

    const filtered = submissions.filter(
      (s) =>
        s.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.bookTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cohortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.dailyAnswer && s.dailyAnswer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.review && s.review.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setFilteredSubmissions(filtered);
  }, [searchQuery, submissions]);

  const handleRowClick = (submission: SubmissionWithParticipant) => {
    setSelectedSubmission(submission);
    setIsDialogOpen(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // 기수가 선택되지 않은 경우
  if (!selectedCohortId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">독서 인증 관리</h1>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <Users className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">기수를 먼저 선택해주세요</h2>
          <p className="text-gray-600">상단 헤더에서 기수를 선택해야 합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">독서 인증 관리</h1>
          <p className="text-muted-foreground">전체 독서 인증 내역 및 분석</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          {showAnalytics ? '분석 숨기기' : '분석 보기'}
        </Button>
      </div>

      {/* 분석 섹션 */}
      {showAnalytics && analytics && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 시간대별 분포 차트 */}
            <div className="lg:col-span-2">
              <TimeDistributionChart
                data={analytics.timeDistribution}
                isLoading={analyticsLoading}
              />
            </div>

            {/* 참여 지표 */}
            <ParticipationPanel
              data={analytics.participation}
              isLoading={analyticsLoading}
            />

            {/* 리뷰 품질 */}
            <ReviewQualityPanel
              data={analytics.reviewQuality}
              isLoading={analyticsLoading}
            />

            {/* 전체 책 목록 */}
            <div className="lg:col-span-2">
              <AllBooksPanel
                data={analytics.allBooks}
                isLoading={analyticsLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="mb-6">
        <TableSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="참가자, 책 제목, 리뷰, 가치관 답변으로 검색..."
        />
      </div>

      {/* 리스트형 테이블 */}
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">날짜</TableHead>
              <TableHead className="w-[100px]">기수</TableHead>
              <TableHead className="w-[120px]">참가자</TableHead>
              <TableHead className="w-[200px]">책 제목</TableHead>
              <TableHead>리뷰 / 답변</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions.map((submission) => (
              <TableRow
                key={submission.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleRowClick(submission)}
              >
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestampKST(submission.submittedAt, 'MM.dd HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal text-xs">
                    {submission.cohortName}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {submission.participantName}
                </TableCell>
                <TableCell className="font-medium truncate max-w-[200px]" title={submission.bookTitle}>
                  {submission.bookTitle}
                </TableCell>
                <TableCell className="max-w-[400px]">
                  <div className="space-y-1">
                    {submission.review && (
                      <p className="text-sm text-muted-foreground truncate">
                        {submission.review}
                      </p>
                    )}
                    {submission.dailyQuestion && (
                      <div className="flex items-center gap-1 text-xs text-primary/80">
                        <span className="font-semibold shrink-0">Q.</span>
                        <span className="truncate">{submission.dailyQuestion}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
            {filteredSubmissions.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {searchQuery ? '검색 결과가 없습니다' : '등록된 독서 인증이 없습니다'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 상세 보기 다이얼로그 */}
      <SubmissionDetailDialog
        submission={selectedSubmission}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
