'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { Loader2, TrendingDown, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getFunnelData,
  FunnelStepData,
  PeriodFilter,
} from '@/lib/firebase/funnel';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: '7days', label: '최근 7일' },
  { value: '30days', label: '최근 30일' },
  { value: 'all', label: '전체' },
];

const MEMBER_TYPE_OPTIONS = [
  { value: 'new', label: '신규 회원' },
  { value: 'existing', label: '기존 회원' },
  { value: 'waitlist', label: '웨이팅' },
] as const;

// 바 차트 색상 (점진적 그라데이션 - 12단계 대응)
const BAR_COLORS = [
  '#1D4ED8', // blue-700 (온보딩 영상)
  '#2563EB', // blue-600 (검증된 사람들)
  '#3B82F6', // blue-500 (2주간 독서)
  '#60A5FA', // blue-400 (클로징 파티)
  '#93C5FD', // blue-300 (인트로)
  '#BFDBFE', // blue-200 (회원 유형 선택)
  '#DBEAFE', // blue-100 (기본 정보)
  '#EFF6FF', // blue-50 (직장 정보)
  '#F8FAFC', // slate-50 (유입 채널)
  '#F1F5F9', // slate-100 (사진 업로드)
  '#E2E8F0', // slate-200 (생년월일)
  '#CBD5E1', // slate-300 (제출 완료)
];

export default function FunnelAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('7days');
  const [memberType, setMemberType] = useState<'new' | 'existing' | 'waitlist'>('new');
  const [funnelData, setFunnelData] = useState<FunnelStepData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getFunnelData(period, memberType);
        setFunnelData(data);
      } catch (error) {
        console.error('Failed to fetch funnel data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period, memberType]);

  // 총 세션 수 (첫 단계 카운트)
  const totalSessions = funnelData[0]?.count || 0;

  // 제출 완료 수 (마지막 단계 카운트)
  const completedSessions = funnelData[funnelData.length - 1]?.count || 0;

  // 전체 전환률
  const overallConversionRate = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">퍼널 분석</h1>
          <p className="text-gray-500 mt-1">신청서 단계별 전환률 분석</p>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-3">
          {/* 기간 필터 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  period === option.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* 회원 유형 필터 */}
          <select
            value={memberType}
            onChange={(e) => setMemberType(e.target.value as typeof memberType)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
          >
            {MEMBER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">총 방문</p>
              <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowRight className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">제출 완료</p>
              <p className="text-2xl font-bold text-gray-900">{completedSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">전체 전환률</p>
              <p className="text-2xl font-bold text-gray-900">{overallConversionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 바 차트 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">단계별 전환 현황</h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : funnelData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-gray-500">
            <TrendingDown className="h-12 w-12 mb-4 text-gray-300" />
            <p>데이터가 없습니다</p>
            <p className="text-sm mt-1">선택한 기간에 퍼널 이벤트가 기록되지 않았습니다.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={520}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 20, right: 80, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                domain={[0, 'dataMax']}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                type="category"
                dataKey="stepLabel"
                width={90}
                tick={{ fontSize: 13 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as FunnelStepData;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="font-semibold text-gray-900">{data.stepLabel}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          방문: <span className="font-medium">{data.count}명</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          첫 단계 대비: <span className="font-medium">{data.percentage}%</span>
                        </p>
                        {data.stepId !== funnelData[funnelData.length - 1]?.stepId && (
                          <p className="text-sm text-red-600">
                            이탈률: <span className="font-medium">{data.dropoffRate}%</span>
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  formatter={(value) => `${value}명`}
                  style={{ fontSize: 12, fill: '#6B7280' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 상세 테이블 */}
      {!isLoading && funnelData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">단계별 상세 데이터</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    단계
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    방문 수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    첫 단계 대비
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이탈률
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {funnelData.map((step, index) => (
                  <tr key={step.stepId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {step.stepLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {step.count}명
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          step.percentage >= 70
                            ? 'text-green-600'
                            : step.percentage >= 40
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        )}
                      >
                        {step.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {index === funnelData.length - 1 ? (
                        <span className="text-sm text-gray-400">-</span>
                      ) : (
                        <span
                          className={cn(
                            'text-sm font-medium',
                            step.dropoffRate <= 20
                              ? 'text-green-600'
                              : step.dropoffRate <= 40
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          )}
                        >
                          {step.dropoffRate}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
