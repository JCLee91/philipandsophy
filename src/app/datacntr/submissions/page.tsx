'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Calendar, User, BookOpen, BarChart3, MessageSquare } from 'lucide-react';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TableSearch from '@/components/datacntr/table/TableSearch';
import TimeDistributionChart from '@/components/datacntr/dashboard/TimeDistributionChart';
import ParticipationPanel from '@/components/datacntr/dashboard/ParticipationPanel';
import ReviewQualityPanel from '@/components/datacntr/dashboard/ReviewQualityPanel';
import type { ReadingSubmission } from '@/types/database';
import type { SubmissionAnalytics } from '@/types/datacntr';

interface SubmissionWithParticipant extends ReadingSubmission {
  participantName: string;
  cohortName: string;
}

export default function SubmissionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionWithParticipant[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionWithParticipant[]>([]);
  const [analytics, setAnalytics] = useState<SubmissionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(true);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 인증 데이터 로드
  useEffect(() => {
    if (!user) return;

    const fetchSubmissions = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/submissions', {
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
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [user]);

  // 분석 데이터 로드
  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/stats/submissions', {
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
        console.error(error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  // 검색 필터링 (가치관 답변 포함)
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSubmissions(submissions);
      return;
    }

    const filtered = submissions.filter(
      (s) =>
        s.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cohortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.dailyAnswer && s.dailyAnswer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.review && s.review.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setFilteredSubmissions(filtered);
  }, [searchQuery, submissions]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

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

      {/* 인증 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubmissions.map((submission) => {
          return (
            <Card key={submission.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* 인증 사진 */}
              {submission.bookImageUrl && (
                <div className="aspect-video bg-muted relative">
                  <img
                    src={submission.bookImageUrl}
                    alt={submission.bookTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <CardHeader className="space-y-3">
                {/* 참가자 정보 */}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    <User className="h-3 w-3 mr-1" />
                    {submission.participantName}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {submission.cohortName}
                  </Badge>
                </div>

                {/* 책 정보 */}
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <CardTitle className="text-base leading-tight">
                      {submission.bookTitle}
                    </CardTitle>
                    {submission.bookAuthor && (
                      <CardDescription className="text-sm mt-1">
                        {submission.bookAuthor}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* 리뷰 */}
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {submission.review}
                  </p>
                </div>

                {/* 가치관 질문 & 답변 */}
                {submission.dailyQuestion && submission.dailyAnswer && (
                  <div className="pt-3 border-t">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-semibold text-primary">
                          {submission.dailyQuestion}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {submission.dailyAnswer}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 날짜 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatTimestampKST(submission.submittedAt, 'yyyy년 M월 d일 HH:mm')}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSubmissions.length === 0 && !isLoading && (
        <Card className="p-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 독서 인증이 없습니다'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
