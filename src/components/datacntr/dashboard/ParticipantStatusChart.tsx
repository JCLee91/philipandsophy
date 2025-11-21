'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ParticipantStatusData {
  active: number;   // 활성 (3일 이내)
  moderate: number; // 보통 (4-7일)
  dormant: number;  // 휴면 (7일 이상)
}

interface ParticipantStatusChartProps {
  data: ParticipantStatusData;
  isLoading?: boolean;
}

const COLORS = {
  active: '#10b981',    // 녹색
  moderate: '#f59e0b',  // 노란색
  dormant: '#ef4444',   // 빨간색
};

export default function ParticipantStatusChart({ data, isLoading }: ParticipantStatusChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="h-[250px] shimmer rounded" />
      </div>
    );
  }

  const total = data.active + data.moderate + data.dormant;

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">참가자 데이터가 없습니다</p>
      </div>
    );
  }

  const chartData = [
    {
      name: '활성 (3일 이내)',
      value: data.active,
      percentage: Math.round((data.active / total) * 100),
    },
    {
      name: '보통 (4-7일)',
      value: data.moderate,
      percentage: Math.round((data.moderate / total) * 100),
    },
    {
      name: '휴면 (7일 이상)',
      value: data.dormant,
      percentage: Math.round((data.dormant / total) * 100),
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">참가자 활동 상태</h3>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.name.includes('활성')
                    ? COLORS.active
                    : entry.name.includes('보통')
                      ? COLORS.moderate
                      : COLORS.dormant
                }
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value}명`, '참가자']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 요약 */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-green-600">{data.active}</p>
          <p className="text-xs text-gray-600 mt-1">활성</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-yellow-600">{data.moderate}</p>
          <p className="text-xs text-gray-600 mt-1">보통</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">{data.dormant}</p>
          <p className="text-xs text-gray-600 mt-1">휴면</p>
        </div>
      </div>
    </div>
  );
}
