'use client';

/**
 * Custom Push Notification Data Center Page
 * 관리자가 커스텀 푸시 알림을 직접 전송하는 페이지
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';
import FormSelect, { SelectOption } from '@/components/datacntr/form/FormSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Cohort {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Participant {
  id: string;
  name: string;
  role: string;
}

const NOTIFICATION_ROUTES = [
  { value: '/app/chat', label: '채팅방' },
  { value: '/app/chat/today-library', label: '오늘의 서재' },
  { value: '/app/profile', label: '프로필' },
  { value: '/app/program', label: '프로그램' },
];

const NOTIFICATION_TYPES = [
  { value: 'custom', label: '커스텀' },
  { value: 'notice', label: '공지' },
  { value: 'event', label: '이벤트' },
  { value: 'reminder', label: '리마인더' },
];

export default function CustomNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    targetType: 'cohort' as 'cohort' | 'participants' | 'unverified' | 'admins-only',
    cohortId: '',
    participantIds: '',
    title: '',
    body: '',
    route: '/app/chat',
    type: 'custom',
    includeAdmins: true, // 관리자 포함 여부 (기본값: true)
  });

  // Fetch cohorts on mount
  useEffect(() => {
    const fetchCohorts = async () => {
      if (!user) {
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts/list', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch cohorts');
        }

        const data = await response.json();
        const cohortsList: Cohort[] = data.cohorts;

        setCohorts(cohortsList);

        // Set default to active cohort or first cohort
        const activeCohort = cohortsList.find((c) => c.isActive);
        if (activeCohort) {
          setFormData((prev) => ({ ...prev, cohortId: activeCohort.id }));
        } else if (cohortsList.length > 0) {
          setFormData((prev) => ({ ...prev, cohortId: cohortsList[0].id }));
        }

      } catch (error) {

        toast({
          title: '코호트 조회 실패',
          description: '코호트 목록을 불러올 수 없습니다.',
          variant: 'destructive',
        });
      } finally {
        setLoadingCohorts(false);
      }
    };

    fetchCohorts();
  }, [user, toast]);

  // Fetch participants when cohort or target type changes
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!user || !formData.cohortId) {
        setParticipants([]);
        setSelectedParticipantIds([]);
        return;
      }

      // Only fetch for 'participants' or 'unverified' target types
      if (formData.targetType !== 'participants' && formData.targetType !== 'unverified') {
        setParticipants([]);
        setSelectedParticipantIds([]);
        return;
      }

      setLoadingParticipants(true);
      try {
        const idToken = await user.getIdToken();
        const endpoint =
          formData.targetType === 'unverified'
            ? `/api/datacntr/participants/unverified?cohortId=${formData.cohortId}`
            : `/api/datacntr/participants/list?cohortId=${formData.cohortId}`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch participants');
        }

        const data = await response.json();
        setParticipants(data.participants);
        setSelectedParticipantIds([]); // Reset selection when cohort or type changes

      } catch (error) {

        toast({
          title: '참가자 조회 실패',
          description: '참가자 목록을 불러올 수 없습니다.',
          variant: 'destructive',
        });
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [user, formData.cohortId, formData.targetType, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: '인증 오류',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    // Validate form
    if (!formData.title || !formData.body) {
      toast({
        title: '입력 오류',
        description: '제목과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.targetType === 'participants' && selectedParticipantIds.length === 0) {
      toast({
        title: '입력 오류',
        description: '최소 1명 이상의 수신자를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.targetType === 'unverified' && participants.length === 0) {
      toast({
        title: '전송 불필요',
        description: '모든 참여자가 이미 인증을 완료했습니다.',
        variant: 'destructive',
      });
      return;
    }

    // 코호트 전체 발송 시 cohortId 필수
    if (formData.targetType === 'cohort' && !formData.cohortId) {
      toast({
        title: '입력 오류',
        description: '코호트를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      const idToken = await user.getIdToken();

      const requestBody: any = {
        title: formData.title,
        body: formData.body,
        route: formData.route,
        type: formData.type,
        includeAdmins: formData.includeAdmins, // 관리자 포함 여부
      };

      // ✅ 라우트에 cohortId 파라미터 추가 (정확한 기수 페이지로 이동)
      if (formData.cohortId && requestBody.route.startsWith('/app')) {
        const separator = requestBody.route.includes('?') ? '&' : '?';
        requestBody.route = `${requestBody.route}${separator}cohort=${formData.cohortId}`;
      }

      if (formData.targetType === 'cohort') {
        requestBody.cohortId = formData.cohortId;
      } else if (formData.targetType === 'unverified') {
        // Send to all unverified participants (automatically fetched from API)
        requestBody.participantIds = participants.map((p) => p.id);
      } else if (formData.targetType === 'admins-only') {
        // Send to admins only (empty participantIds array, backend will fetch admins)
        requestBody.participantIds = [];
        requestBody.includeAdmins = true; // Force include admins
      } else {
        // Use selected participant IDs
        requestBody.participantIds = selectedParticipantIds;
      }

      const response = await fetch('/api/admin/notifications/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '알림 전송 실패');
      }

      const result = await response.json();

      toast({
        title: '알림 전송 완료',
        description: `${result.totalRecipients}명에게 알림을 전송했습니다. (FCM: ${result.totalFCM}, Web Push: ${result.totalWebPush}, 성공: ${result.notificationsSent})`,
      });

      // Reset form
      setFormData({
        ...formData,
        title: '',
        body: '',
      });
    } catch (error) {

      toast({
        title: '알림 전송 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Loading state
  if (loadingCohorts) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">커스텀 푸시 알림</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">코호트 목록 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">커스텀 푸시 알림</h1>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Type Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium">수신 대상</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="cohort"
                  checked={formData.targetType === 'cohort'}
                  onChange={(e) =>
                    setFormData({ ...formData, targetType: 'cohort' })
                  }
                  className="h-4 w-4"
                />
                <span>코호트 전체</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="participants"
                  checked={formData.targetType === 'participants'}
                  onChange={(e) =>
                    setFormData({ ...formData, targetType: 'participants' })
                  }
                  className="h-4 w-4"
                />
                <span>특정 참가자</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="unverified"
                  checked={formData.targetType === 'unverified'}
                  onChange={(e) =>
                    setFormData({ ...formData, targetType: 'unverified' })
                  }
                  className="h-4 w-4"
                />
                <span>미인증 참여자</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="admins-only"
                  checked={formData.targetType === 'admins-only'}
                  onChange={(e) =>
                    setFormData({ ...formData, targetType: 'admins-only' })
                  }
                  className="h-4 w-4"
                />
                <span>내부 테스팅용</span>
              </label>
            </div>
          </div>

          {/* Cohort Selection (conditional) */}
          {formData.targetType === 'cohort' && (
            <div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  코호트 선택
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Select
                  value={formData.cohortId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cohortId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="코호트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        코호트가 없습니다
                      </div>
                    ) : (
                      cohorts.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          <div className="flex items-center gap-2">
                            <span>{cohort.name}</span>
                            {cohort.isActive && (
                              <span className="text-xs font-medium text-green-600">
                                • 활성
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                선택한 코호트의 모든 참가자에게 알림이 전송됩니다
              </p>
            </div>
          )}

          {/* Unverified Participants Selection (conditional) */}
          {formData.targetType === 'unverified' && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                미인증 참여자
                <span className="text-red-500 ml-1">*</span>
              </label>

              {/* Cohort Selection for Unverified Participants */}
              <div className="mb-4">
                <Select
                  value={formData.cohortId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cohortId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="코호트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        <div className="flex items-center gap-2">
                          <span>{cohort.name}</span>
                          {cohort.isActive && (
                            <span className="text-xs font-medium text-green-600">
                              • 활성
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unverified Participants List */}
              {loadingParticipants ? (
                <div className="flex items-center justify-center py-8 border rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">미인증 참여자 조회 중...</span>
                </div>
              ) : participants.length === 0 ? (
                <div className="py-8 text-center border rounded-lg">
                  {formData.cohortId ? (
                    <div>
                      <Check className="h-12 w-12 mx-auto text-green-600 mb-2" />
                      <p className="text-green-600 font-medium">
                        모든 참여자가 오늘 독서 인증을 완료했습니다! 🎉
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">먼저 코호트를 선택하세요</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span className="text-sm text-gray-900">{participant.name}</span>
                        {participant.role === 'admin' && (
                          <span className="text-xs text-blue-600 font-medium">관리자</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-red-600 font-medium">
                    ⚠️ 미인증 참여자: {participants.length}명
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    이 참여자들에게 알림이 자동으로 전송됩니다
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Participant Checkbox Selection (conditional) */}
          {formData.targetType === 'participants' && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                수신자 선택
                <span className="text-red-500 ml-1">*</span>
              </label>

              {/* Cohort Selection for Participant List */}
              <div className="mb-4">
                <Select
                  value={formData.cohortId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cohortId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="먼저 코호트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        <div className="flex items-center gap-2">
                          <span>{cohort.name}</span>
                          {cohort.isActive && (
                            <span className="text-xs font-medium text-green-600">
                              • 활성
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Participant Checkbox List */}
              {loadingParticipants ? (
                <div className="flex items-center justify-center py-8 border rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">참가자 목록 불러오는 중...</span>
                </div>
              ) : participants.length === 0 ? (
                <div className="py-8 text-center border rounded-lg text-gray-500">
                  {formData.cohortId
                    ? '해당 코호트에 참가자가 없습니다'
                    : '먼저 코호트를 선택하세요'}
                </div>
              ) : (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {/* Select All Checkbox */}
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        participants.length > 0 &&
                        selectedParticipantIds.length === participants.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          // 함수형 업데이트: 빠른 클릭 시 상태 꼬임 방지
                          setSelectedParticipantIds(() => participants.map((p) => p.id));
                        } else {
                          setSelectedParticipantIds(() => []);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="font-medium text-sm text-gray-700">전체 선택</span>
                  </label>

                  {/* Individual Participant Checkboxes */}
                  {participants.map((participant) => (
                    <label
                      key={participant.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipantIds.includes(participant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // 함수형 업데이트: 이전 상태 기반으로 안전하게 추가
                            setSelectedParticipantIds((prev) => [...prev, participant.id]);
                          } else {
                            // 함수형 업데이트: 이전 상태 기반으로 안전하게 제거
                            setSelectedParticipantIds((prev) =>
                              prev.filter((id) => id !== participant.id)
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-900">{participant.name}</span>
                      {participant.role === 'admin' && (
                        <span className="text-xs text-blue-600 font-medium">관리자</span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <p className="mt-2 text-sm text-gray-500">
                선택된 참가자: {selectedParticipantIds.length}명
              </p>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium">
              알림 제목 *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="알림 제목을 입력하세요"
              required
            />
          </div>

          {/* Body Input */}
          <div>
            <label htmlFor="body" className="mb-2 block text-sm font-medium">
              알림 내용 *
            </label>
            <textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="알림 내용을 입력하세요"
              rows={4}
              required
            />
          </div>

          {/* Route Selection */}
          <FormSelect
            label="클릭 시 이동 경로"
            value={formData.route}
            options={NOTIFICATION_ROUTES}
            onChange={(value) => setFormData({ ...formData, route: value })}
            placeholder="이동 경로 선택"
          />

          {/* Type Selection */}
          <FormSelect
            label="알림 타입"
            value={formData.type}
            options={NOTIFICATION_TYPES}
            onChange={(value) => setFormData({ ...formData, type: value })}
            placeholder="알림 타입 선택"
          />

          {/* Include Admins Checkbox (disabled for admins-only mode) */}
          {formData.targetType !== 'admins-only' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeAdmins"
                checked={formData.includeAdmins}
                onChange={(e) => setFormData({ ...formData, includeAdmins: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="includeAdmins" className="text-sm font-medium text-gray-700 cursor-pointer">
                관리자에게도 알림 전송
              </label>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => {
                const activeCohort = cohorts.find((c) => c.isActive);
                const defaultCohortId = activeCohort?.id || cohorts[0]?.id || '';

                setFormData({
                  targetType: 'cohort',
                  cohortId: defaultCohortId,
                  participantIds: '',
                  title: '',
                  body: '',
                  route: '/app/chat',
                  type: 'custom',
                  includeAdmins: true,
                });
                setSelectedParticipantIds([]);
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 font-medium transition-colors hover:bg-gray-50"
              disabled={sending}
            >
              초기화
            </button>
            <button
              type="submit"
              className="rounded-lg bg-black px-6 py-2 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={sending}
            >
              {sending ? '전송 중...' : '알림 전송'}
            </button>
          </div>
        </form>
      </div>

      {/* Usage Guide */}
      <div className="mt-8 rounded-lg border bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold">사용 가이드</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
          <li>
            <strong>코호트 전체:</strong> 선택한 코호트의 모든 참가자에게 알림 전송
          </li>
          <li>
            <strong>특정 참가자:</strong> 체크박스로 선택한 참가자에게만 알림 전송
          </li>
          <li>
            <strong>미인증 참여자:</strong> 오늘 독서 인증을 하지 않은 참가자에게만 자동 전송 (매일 리마인더에 유용)
          </li>
          <li>
            <strong>이동 경로:</strong> 사용자가 알림을 클릭할 때 이동할 앱 내 경로
          </li>
          <li>
            <strong>알림 타입:</strong> 알림 분류 (통계 및 필터링 용도)
          </li>
          <li>
            <strong>이원화 전략:</strong> FCM (Android/Desktop) + Web Push (iOS Safari) 자동 발송
          </li>
        </ul>
      </div>
    </div>
  );
}
