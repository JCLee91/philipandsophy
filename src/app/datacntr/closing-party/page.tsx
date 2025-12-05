'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatacntrStore } from '@/stores/datacntr-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Trophy,
  Sun,
  Moon,
  BookOpen,
  PenLine,
  MessageCircle,
  Award,
  Medal,
  RefreshCw,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  UsersRound,
  Shuffle,
  GripVertical,
  UserX,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ClosingPartyStats, ClosingPartyGroup, ClosingPartyGroupMember } from '@/types/database';

export const dynamic = 'force-dynamic';

function formatTimestamp(timestamp: any): string {
  try {
    if (timestamp?.seconds) {
      return format(new Date(timestamp.seconds * 1000), 'yyyy.MM.dd HH:mm', { locale: ko });
    }
    if (timestamp?._seconds) {
      return format(new Date(timestamp._seconds * 1000), 'yyyy.MM.dd HH:mm', { locale: ko });
    }
    return format(new Date(timestamp), 'yyyy.MM.dd HH:mm', { locale: ko });
  } catch {
    return '-';
  }
}

interface StatsResponse {
  stats: ClosingPartyStats | null;
  isCalculated: boolean;
  canCalculate: boolean;
  programEnded: boolean;
  calculationAvailableAt: string;
  message?: string;
}

interface GroupsResponse {
  groups: ClosingPartyGroup[] | null;
  groupFormationAt: any;
  hasClusterData: boolean;
  totalParticipants: number;
}

// 드래그 가능한 멤버 카드
function DraggableMemberCard({
  member,
  groupId,
}: {
  member: ClosingPartyGroupMember;
  groupId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${groupId}-${member.participantId}`,
    data: { member, groupId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-2 bg-background border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={member.profileImageCircle} alt={member.name} />
        <AvatarFallback className="text-xs">{member.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <p className="flex-1 text-sm font-medium truncate">{member.name}</p>
      <span className="text-xs text-muted-foreground flex-shrink-0">{member.submissionCount || 0}회</span>
    </div>
  );
}

// 오버레이용 멤버 카드 (드래그 중 표시)
function MemberCardOverlay({ member }: { member: ClosingPartyGroupMember }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background border-2 border-primary rounded-lg shadow-lg">
      <GripVertical className="h-4 w-4 text-primary flex-shrink-0" />
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={member.profileImageCircle} alt={member.name} />
        <AvatarFallback className="text-xs">{member.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.name}</p>
      </div>
    </div>
  );
}

// 드롭 가능한 그룹 카드
function DroppableGroupCard({
  group,
  isDropTarget,
}: {
  group: ClosingPartyGroup;
  isDropTarget: boolean;
}) {
  const tierLabel = {
    active: '활발',
    moderate: '보통',
    inactive: '저조',
    mixed: '혼합',
  };

  const tierColor = {
    active: 'bg-green-100 text-green-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-gray-100 text-gray-600',
    mixed: 'bg-blue-100 text-blue-700',
  };

  return (
    <Card
      className={`transition-all ${
        isDropTarget ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            {group.groupNumber}조
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={tierColor[group.tier]}>
              {tierLabel[group.tier]}
            </Badge>
            <Badge variant="secondary">{group.members?.length || 0}명</Badge>
          </div>
        </CardTitle>
        {group.averageAffinity > 0 && (
          <CardDescription>평균 친밀도: {group.averageAffinity}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <SortableContext
          items={(group.members || []).map((m) => `${group.groupId}-${m.participantId}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {(group.members || []).map((member) => (
              <DraggableMemberCard
                key={member.participantId}
                member={member}
                groupId={group.groupId}
              />
            ))}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

// 불참조 카드
function AbsentGroupCard({
  group,
  isDropTarget,
}: {
  group: ClosingPartyGroup | undefined;
  isDropTarget: boolean;
}) {
  const members = group?.members || [];

  // 빈 영역도 드롭 가능하도록 useDroppable 사용
  const { setNodeRef } = useDroppable({
    id: 'absent-drop-zone',
  });

  return (
    <Card
      ref={setNodeRef}
      className={`border-dashed transition-all ${
        isDropTarget ? 'ring-2 ring-destructive ring-offset-2 bg-destructive/5' : 'border-muted-foreground/30'
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg text-muted-foreground">
          <span className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            불참조
          </span>
          <Badge variant="outline" className="text-muted-foreground">
            {members.length}명
          </Badge>
        </CardTitle>
        <CardDescription>파티에 참석하지 않는 인원</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          <SortableContext
            items={members.map((m) => `absent-${m.participantId}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <DraggableMemberCard
                  key={member.participantId}
                  member={member}
                  groupId="absent"
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            불참자를 이 곳으로 드래그하세요
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClosingPartyPage() {
  const { user } = useAuth();
  const { selectedCohortId } = useDatacntrStore();
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsData, setGroupsData] = useState<GroupsResponse | null>(null);
  const [formingGroups, setFormingGroups] = useState(false);

  // DnD 상태
  const [activeMember, setActiveMember] = useState<{
    member: ClosingPartyGroupMember;
    groupId: string;
  } | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchStats = async () => {
    if (!user || !selectedCohortId) return;

    try {
      setLoading(true);
      setError(null);
      const idToken = await user.getIdToken();
      const response = await fetch(
        `/api/datacntr/closing-party?cohortId=${selectedCohortId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      if (!response.ok) throw new Error('통계를 불러오는데 실패했습니다.');

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!user || !selectedCohortId) return;

    try {
      setGroupsLoading(true);
      const idToken = await user.getIdToken();
      const response = await fetch(
        `/api/datacntr/closing-party/groups?cohortId=${selectedCohortId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      if (!response.ok) throw new Error('조 편성을 불러오는데 실패했습니다.');

      const result = await response.json();
      setGroupsData(result);
    } catch (err) {
      console.error('Groups fetch error:', err);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!user || !selectedCohortId) return;

    try {
      setCalculating(true);
      setError(null);
      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/closing-party/calculate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cohortId: selectedCohortId }),
      });

      if (!response.ok) throw new Error('통계 계산에 실패했습니다.');

      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setCalculating(false);
    }
  };

  const handleFormGroups = async () => {
    if (!user || !selectedCohortId) return;

    try {
      setFormingGroups(true);
      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/closing-party/groups', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cohortId: selectedCohortId, targetGroupSize: 6 }),
      });

      if (!response.ok) throw new Error('조 편성에 실패했습니다.');

      await fetchGroups();
    } catch (err) {
      console.error('Form groups error:', err);
    } finally {
      setFormingGroups(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { member: ClosingPartyGroupMember; groupId: string };
    setActiveMember(data);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (over) {
      // over.id에서 groupId 추출
      const overId = over.id as string;
      if (overId.startsWith('absent')) {
        setOverGroupId('absent');
      } else {
        const groupId = overId.split('-').slice(0, 2).join('-'); // "group-1-xxx" -> "group-1"
        setOverGroupId(groupId);
      }
    } else {
      setOverGroupId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMember(null);
    setOverGroupId(null);

    if (!over || !user || !selectedCohortId || !groupsData?.groups) return;

    const activeData = active.data.current as { member: ClosingPartyGroupMember; groupId: string };
    const overId = over.id as string;

    // 타겟 그룹 찾기
    let toGroupId: string | null = null;

    // 불참조 체크 (absent 그룹이 없어도 드롭 가능)
    if (overId.startsWith('absent')) {
      toGroupId = 'absent';
    } else {
      for (const group of groupsData.groups) {
        if (overId.startsWith(group.groupId)) {
          toGroupId = group.groupId;
          break;
        }
      }
    }

    if (!toGroupId || toGroupId === activeData.groupId) return;

    // 서버에 이동 요청
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/closing-party/groups', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cohortId: selectedCohortId,
          participantId: activeData.member.participantId,
          fromGroupId: activeData.groupId,
          toGroupId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGroupsData((prev) => (prev ? { ...prev, groups: result.groups } : prev));
      }
    } catch (err) {
      console.error('Move member error:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user, selectedCohortId]);

  useEffect(() => {
    if (activeTab === 'groups' && data?.isCalculated) {
      fetchGroups();
    }
  }, [activeTab, data?.isCalculated]);

  if (!selectedCohortId) {
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

  if (loading) {
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

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchStats}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.isCalculated) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              클로징 파티
            </CardTitle>
            <CardDescription>
              {data?.programEnded
                ? '프로그램이 종료되었습니다. 통계를 계산해주세요.'
                : `프로그램이 아직 진행 중입니다.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              {data?.message || '통계가 아직 계산되지 않았습니다.'}
            </p>
            {data?.canCalculate && (
              <Button onClick={handleCalculate} disabled={calculating}>
                {calculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    계산 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    통계 계산하기
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data.stats!;

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            {activeTab === 'stats' && (
              <Button variant="outline" onClick={handleCalculate} disabled={calculating} size="sm">
                {calculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    재계산 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    수동 재계산
                  </>
                )}
              </Button>
            )}
            {activeTab === 'groups' && groupsData?.groups && (
              <Button variant="outline" onClick={handleFormGroups} disabled={formingGroups} size="sm">
                {formingGroups ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    재편성 중...
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4 mr-2" />
                    다시 편성하기
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 통계 탭 */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">총 참가자</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalParticipants}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">총 인증</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalSubmissions}건</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">개근</span>
                </div>
                <p className="text-2xl font-bold">{stats.perfectAttendance.length}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">준개근</span>
                </div>
                <p className="text-2xl font-bold">{stats.almostPerfectAttendance.length}명</p>
              </CardContent>
            </Card>
          </div>

          {/* Award Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AwardCard
              icon={<Sun className="h-5 w-5 text-orange-500" />}
              title="얼리버드상"
              description="가장 일찍 인증한 사람"
              winner={stats.earliestSubmitter}
              detail={
                stats.earliestSubmitter
                  ? `${stats.earliestSubmitter.submissionTime} (${stats.earliestSubmitter.submissionDate})`
                  : null
              }
            />
            <AwardCard
              icon={<Moon className="h-5 w-5 text-indigo-500" />}
              title="올빼미상"
              description="마감 직전에 인증한 사람"
              winner={stats.latestSubmitter}
              detail={
                stats.latestSubmitter
                  ? `${stats.latestSubmitter.submissionTime} (${stats.latestSubmitter.submissionDate})`
                  : null
              }
            />
            <AwardCard
              icon={<BookOpen className="h-5 w-5 text-green-500" />}
              title="다독왕"
              description="가장 많은 책을 읽은 사람"
              winner={stats.mostBooksReader}
              detail={stats.mostBooksReader ? `${stats.mostBooksReader.uniqueBookCount}권` : null}
              subDetail={
                stats.mostBooksReader
                  ? stats.mostBooksReader.bookTitles.slice(0, 3).join(', ') +
                    (stats.mostBooksReader.bookTitles.length > 3 ? '...' : '')
                  : null
              }
            />
            <AwardCard
              icon={<PenLine className="h-5 w-5 text-blue-500" />}
              title="감상평왕"
              description="가장 긴 감상평을 쓴 사람"
              winner={stats.longestReviewWriter}
              detail={
                stats.longestReviewWriter
                  ? `평균 ${stats.longestReviewWriter.averageLength}자`
                  : null
              }
            />
            <AwardCard
              icon={<MessageCircle className="h-5 w-5 text-purple-500" />}
              title="가치관왕"
              description="가장 긴 답변을 쓴 사람"
              winner={stats.longestAnswerWriter}
              detail={
                stats.longestAnswerWriter
                  ? `평균 ${stats.longestAnswerWriter.averageLength}자`
                  : null
              }
            />
          </div>

          {/* 개근상 & 준개근상 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-yellow-500" />
                  개근상
                  <Badge variant="secondary">{stats.perfectAttendance.length}명</Badge>
                </CardTitle>
                <CardDescription>{stats.programPeriod.totalDays}일 전부 인증한 사람</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.perfectAttendance.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.perfectAttendance.map((p) => (
                      <Badge key={p.participantId} variant="outline" className="text-sm">
                        {p.participantName}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">해당자 없음</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Medal className="h-5 w-5 text-gray-400" />
                  준개근상
                  <Badge variant="secondary">{stats.almostPerfectAttendance.length}명</Badge>
                </CardTitle>
                <CardDescription>하루만 빠지고 다 인증한 사람</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.almostPerfectAttendance.length > 0 ? (
                  <div className="space-y-2">
                    {stats.almostPerfectAttendance.map((p) => (
                      <div key={p.participantId} className="flex items-center justify-between">
                        <Badge variant="outline" className="text-sm">
                          {p.participantName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{p.missedDate} 미인증</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">해당자 없음</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <div className="text-sm text-muted-foreground">
              마지막 계산: {stats.calculatedAt && formatTimestamp(stats.calculatedAt)}
              {' • '}
              {stats.calculatedBy === 'scheduled' ? '자동' : '수동'}
            </div>
          </div>
        </TabsContent>

        {/* 조 편성 탭 */}
        <TabsContent value="groups" className="space-y-6 mt-6">
          {groupsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !groupsData?.groups ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UsersRound className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">조 편성이 아직 되지 않았습니다</p>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  {groupsData?.hasClusterData
                    ? '클러스터 매칭 데이터를 기반으로 친밀도가 높은 사람들끼리 조가 편성됩니다.'
                    : '인증 횟수가 비슷한 사람들끼리 조가 편성됩니다.'}
                </p>
                <Button onClick={handleFormGroups} disabled={formingGroups}>
                  {formingGroups ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      편성 중...
                    </>
                  ) : (
                    <>
                      <Shuffle className="h-4 w-4 mr-2" />
                      조 편성하기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* 안내 메시지 */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 멤버를 드래그하여 다른 조로 이동할 수 있습니다. 불참자는 불참조로 이동하세요.
              </div>

              {/* 조 목록 (불참조 제외) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupsData.groups
                  .filter((group) => group.groupId !== 'absent')
                  .map((group) => (
                    <DroppableGroupCard
                      key={group.groupId}
                      group={group}
                      isDropTarget={overGroupId === group.groupId && activeMember?.groupId !== group.groupId}
                    />
                  ))}
              </div>

              {/* 불참조 */}
              <AbsentGroupCard
                group={groupsData.groups.find((g) => g.groupId === 'absent')}
                isDropTarget={overGroupId === 'absent' && activeMember?.groupId !== 'absent'}
              />

              {/* 드래그 오버레이 */}
              <DragOverlay>
                {activeMember ? <MemberCardOverlay member={activeMember.member} /> : null}
              </DragOverlay>

              {/* Footer */}
              <div className="flex justify-end">
                <div className="text-sm text-muted-foreground">
                  {groupsData.groupFormationAt && (
                    <>편성일: {formatTimestamp(groupsData.groupFormationAt)}</>
                  )}
                  {groupsData.hasClusterData ? ' • 친밀도 기반' : ' • 인증횟수 기반'}
                </div>
              </div>
            </DndContext>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Award Card Component
function AwardCard({
  icon,
  title,
  description,
  winner,
  detail,
  subDetail,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  winner: { participantId: string; participantName: string } | null;
  detail: string | null;
  subDetail?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {winner ? (
          <div>
            <p className="text-xl font-bold">{winner.participantName}</p>
            {detail && <p className="text-sm text-muted-foreground mt-1">{detail}</p>}
            {subDetail && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{subDetail}</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">해당자 없음</p>
        )}
      </CardContent>
    </Card>
  );
}
