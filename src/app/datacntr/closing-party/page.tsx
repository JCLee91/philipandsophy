'use client';

import { Trophy, RefreshCw, Calendar, AlertCircle, UsersRound, Shuffle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnifiedButton } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClosingParty } from './_hooks/use-closing-party';
import StatsTab from './_components/StatsTab';
import GroupsTab from './_components/GroupsTab';

export const dynamic = 'force-dynamic';

export default function ClosingPartyPage() {
  const party = useClosingParty();

  // 기수 미선택
  if (!party.selectedCohortId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">기수를 선택해주세요</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로딩 상태
  if (party.loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (party.error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive">{party.error}</p>
            <UnifiedButton variant="outline" size="sm" className="mt-4" onClick={party.fetchStats}>
              다시 시도
            </UnifiedButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 통계 미계산 상태
  if (!party.data?.isCalculated) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              클로징 파티
            </CardTitle>
            <CardDescription>
              {party.data?.programEnded
                ? '프로그램이 종료되었습니다. 통계를 계산해주세요.'
                : '프로그램이 아직 진행 중입니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              {party.data?.message || '통계가 아직 계산되지 않았습니다.'}
            </p>
            {party.data?.canCalculate && (
              <UnifiedButton
                onClick={party.handleCalculate}
                disabled={party.calculating}
                loading={party.calculating}
                loadingText="계산 중..."
                icon={<RefreshCw className="h-4 w-4" />}
              >
                통계 계산하기
              </UnifiedButton>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = party.data.stats!;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            클로징 파티
          </h1>
          <p className="text-muted-foreground">
            {stats.cohortName} • {stats.programPeriod.startDate} ~ {stats.programPeriod.endDate}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={party.activeTab} onValueChange={party.setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="stats" className="gap-2">
              <Trophy className="h-4 w-4" />
              통계
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <UsersRound className="h-4 w-4" />
              조 편성
            </TabsTrigger>
          </TabsList>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            {party.activeTab === 'stats' && (
              <UnifiedButton
                variant="outline"
                onClick={party.handleCalculate}
                disabled={party.calculating}
                loading={party.calculating}
                loadingText="재계산 중..."
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                수동 재계산
              </UnifiedButton>
            )}
            {party.activeTab === 'groups' && party.groupsData?.groups && (
              <UnifiedButton
                variant="outline"
                onClick={party.handleFormGroups}
                disabled={party.formingGroups}
                loading={party.formingGroups}
                loadingText="재편성 중..."
                size="sm"
                icon={<Shuffle className="h-4 w-4" />}
              >
                다시 편성하기
              </UnifiedButton>
            )}
          </div>
        </div>

        {/* 통계 탭 */}
        <TabsContent value="stats" className="mt-6">
          <StatsTab stats={stats} />
        </TabsContent>

        {/* 조 편성 탭 */}
        <TabsContent value="groups" className="mt-6">
          <GroupsTab
            groupsLoading={party.groupsLoading}
            groupsData={party.groupsData}
            formingGroups={party.formingGroups}
            activeMember={party.activeMember}
            overGroupId={party.overGroupId}
            sensors={party.sensors}
            onFormGroups={party.handleFormGroups}
            onDragStart={party.handleDragStart}
            onDragOver={party.handleDragOver}
            onDragEnd={party.handleDragEnd}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
