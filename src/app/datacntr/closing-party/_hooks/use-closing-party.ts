'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useAuth } from '@/contexts/AuthContext';
import { useDatacntrStore } from '@/stores/datacntr-store';
import type { ClosingPartyGroupMember } from '@/types/database';
import type { StatsResponse, GroupsResponse } from '../_lib/types';

export function useClosingParty() {
  const { user } = useAuth();
  const { selectedCohortId } = useDatacntrStore();

  // 탭 상태
  const [activeTab, setActiveTab] = useState('stats');

  // Stats 상태
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Groups 상태
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsData, setGroupsData] = useState<GroupsResponse | null>(null);
  const [formingGroups, setFormingGroups] = useState(false);
  const [groupRound, setGroupRound] = useState<'round1' | 'round2'>('round1');

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

  // Stats 가져오기
  const fetchStats = useCallback(async () => {
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
  }, [user, selectedCohortId]);

  // Groups 가져오기
  const fetchGroups = useCallback(async () => {
    if (!user || !selectedCohortId) return;

    try {
      setGroupsLoading(true);
      setError(null);
      const idToken = await user.getIdToken();
      const response = await fetch(
        `/api/datacntr/closing-party/groups?cohortId=${selectedCohortId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      if (!response.ok) throw new Error('조 편성을 불러오는데 실패했습니다.');

      const result = await response.json();
      setGroupsData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '조 편성 로드 오류');
    } finally {
      setGroupsLoading(false);
    }
  }, [user, selectedCohortId]);

  // 통계 계산
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

  // 조 편성
  const handleFormGroups = async () => {
    if (!user || !selectedCohortId) return;

    try {
      setFormingGroups(true);
      setError(null);
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
      setError(err instanceof Error ? err.message : '조 편성 오류');
    } finally {
      setFormingGroups(false);
    }
  };

  // DnD 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current as { member: ClosingPartyGroupMember; groupId: string };
    setActiveMember(activeData);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (over) {
      const overId = over.id as string;
      if (overId.startsWith('absent')) {
        setOverGroupId('absent');
      } else {
        const groupId = overId.split('-').slice(0, 2).join('-');
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

    const activeGroups = groupRound === 'round2' ? groupsData?.groupsRound2 : groupsData?.groups;
    if (!over || !user || !selectedCohortId || !activeGroups) return;

    const activeData = active.data.current as { member: ClosingPartyGroupMember; groupId: string };
    const overId = over.id as string;

    let toGroupId: string | null = null;

    if (overId.startsWith('absent')) {
      toGroupId = 'absent';
    } else {
      for (const group of activeGroups) {
        if (overId.startsWith(group.groupId)) {
          toGroupId = group.groupId;
          break;
        }
      }
    }

    if (!toGroupId || toGroupId === activeData.groupId) return;

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
          round: groupRound === 'round2' ? 2 : 1,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGroupsData((prev) => {
          if (!prev) return prev;
          if (groupRound === 'round2') {
            return { ...prev, groupsRound2: result.groups };
          }
          return { ...prev, groups: result.groups };
        });
      } else {
        setError('멤버 이동에 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '멤버 이동 오류');
    }
  };

  // Effects
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'groups' && data?.isCalculated) {
      fetchGroups();
    }
  }, [activeTab, data?.isCalculated, fetchGroups]);

  return {
    // 상태
    selectedCohortId,
    activeTab,
    setActiveTab,
    loading,
    calculating,
    data,
    error,
    groupsLoading,
    groupsData,
    formingGroups,
    groupRound,
    setGroupRound,
    activeMember,
    overGroupId,
    sensors,

    // 핸들러
    fetchStats,
    handleCalculate,
    handleFormGroups,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
