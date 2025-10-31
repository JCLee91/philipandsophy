'use client';

interface ParticipationData {
  totalSubmissions: number;
  totalActiveParticipants: number;
  dailyAverage: number;
  activeDays: number;
}

interface ParticipationPanelProps {
  data: ParticipationData;
  isLoading?: boolean;
}

export default function ParticipationPanel({ data, isLoading }: ParticipationPanelProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <div className="h-5 w-24 shimmer rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 shimmer rounded" />
          <div className="h-12 shimmer rounded" />
        </div>
      </div>
    );
  }

  const participationRate = data.totalActiveParticipants > 0
    ? Number((data.totalSubmissions / data.totalActiveParticipants).toFixed(1))
    : 0;

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h3 className="text-sm font-medium text-gray-600 mb-4">참여 지표</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">활성 참가자</span>
          <span className="text-lg font-semibold">{data.totalActiveParticipants}명</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">총 인증 수</span>
          <span className="text-lg font-semibold">{data.totalSubmissions}건</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">일일 평균</span>
          <span className="text-lg font-semibold">{data.dailyAverage}건</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">1인당 인증수</span>
          <span className="text-lg font-semibold">{participationRate}건</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">활동 일수</span>
          <span className="text-lg font-semibold">{data.activeDays}일</span>
        </div>
      </div>
    </div>
  );
}
