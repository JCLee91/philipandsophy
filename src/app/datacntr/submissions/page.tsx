'use client';

import { useState, useMemo } from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';
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
import TableSearch from '@/components/datacntr/table/TableSearch';
import TimeDistributionChart from '@/components/datacntr/dashboard/TimeDistributionChart';
import ParticipationPanel from '@/components/datacntr/dashboard/ParticipationPanel';
import ReviewQualityPanel from '@/components/datacntr/dashboard/ReviewQualityPanel';
import AllBooksPanel from '@/components/datacntr/dashboard/AllBooksPanel';
import SubmissionDetailDialog from '@/components/datacntr/submissions/SubmissionDetailDialog';
import { useDatacntrAuth, useFetchWithAuth } from '@/hooks/datacntr';
import { DatacntrPageShell } from '@/components/datacntr/layout';
import type { ReadingSubmission } from '@/types/database';
import type { SubmissionAnalytics } from '@/types/datacntr';

export const dynamic = 'force-dynamic';

interface SubmissionWithParticipant extends ReadingSubmission {
  participantName: string;
  cohortName: string;
}

export default function SubmissionsPage() {
  const { user, isLoading: authLoading, selectedCohortId } = useDatacntrAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithParticipant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 인증 데이터 로드
  const { data: submissions, isLoading: submissionsLoading } = useFetchWithAuth<SubmissionWithParticipant[]>({
    url: `/api/datacntr/submissions?cohortId=${selectedCohortId}`,
    enabled: !!selectedCohortId,
    deps: [selectedCohortId],
    initialData: [],
  });

  // 분석 데이터 로드
  const { data: analytics, isLoading: analyticsLoading } = useFetchWithAuth<SubmissionAnalytics>({
    url: `/api/datacntr/stats/submissions?cohortId=${selectedCohortId}`,
    enabled: !!selectedCohortId,
    deps: [selectedCohortId],
  });

  // 검색 필터링
  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    if (!searchQuery) return submissions;

    const query = searchQuery.toLowerCase();
    return submissions.filter(
      (s) =>
        s.participantName.toLowerCase().includes(query) ||
        s.bookTitle?.toLowerCase().includes(query) ||
        s.cohortName.toLowerCase().includes(query) ||
        s.dailyAnswer?.toLowerCase().includes(query) ||
        s.review?.toLowerCase().includes(query)
    );
  }, [searchQuery, submissions]);

  const handleRowClick = (submission: SubmissionWithParticipant) => {
    setSelectedSubmission(submission);
    setIsDialogOpen(true);
  };

  const isLoading = authLoading || submissionsLoading;

  if (!user && !authLoading) return null;

  return (
    <DatacntrPageShell
      title="독서 인증 관리"
      description="전체 독서 인증 내역 및 분석"
      isLoading={isLoading}
      requiresCohort
      hasCohortSelected={!!selectedCohortId}
      headerActions={
        <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)}>
          <BarChart3 className="h-4 w-4 mr-2" />
          {showAnalytics ? '분석 숨기기' : '분석 보기'}
        </Button>
      }
    >
      {/* 분석 섹션 */}
      {showAnalytics && analytics && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <TimeDistributionChart data={analytics.timeDistribution} isLoading={analyticsLoading} />
            </div>
            <ParticipationPanel data={analytics.participation} isLoading={analyticsLoading} />
            <ReviewQualityPanel data={analytics.reviewQuality} isLoading={analyticsLoading} />
            <div className="lg:col-span-2">
              <AllBooksPanel data={analytics.allBooks} isLoading={analyticsLoading} />
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
                <TableCell className="font-medium">{submission.participantName}</TableCell>
                <TableCell className="font-medium truncate max-w-[200px]" title={submission.bookTitle}>
                  {submission.bookTitle}
                </TableCell>
                <TableCell className="max-w-[400px]">
                  <div className="space-y-1">
                    {submission.review && (
                      <p className="text-sm text-muted-foreground truncate">{submission.review}</p>
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
            {filteredSubmissions.length === 0 && !submissionsLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {searchQuery ? '검색 결과가 없습니다' : '등록된 독서 인증이 없습니다'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SubmissionDetailDialog
        submission={selectedSubmission}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </DatacntrPageShell>
  );
}
