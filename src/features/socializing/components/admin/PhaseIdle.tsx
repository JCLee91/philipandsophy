'use client';

import { Calendar as CalendarIcon, Clock, MapPin, AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { UnifiedButton } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SEOUL_HOTSPOTS, TIME_PRESETS } from '../../constants/socializing-constants';

interface PhaseIdleProps {
  selectedDates: Date[];
  setSelectedDates: (dates: Date[] | undefined) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  selectedLocations: string[];
  toggleLocation: (loc: string) => void;
  customLocation: string;
  setCustomLocation: (loc: string) => void;
  addCustomLocation: () => void;
  totalCombinations: number;
  deadlineHours: number;
  setDeadlineHours: (hours: number) => void;
  estimatedDeadline: string;
  isPending: boolean;
  onStartVoting: () => void;
}

export default function PhaseIdle({
  selectedDates,
  setSelectedDates,
  selectedTime,
  setSelectedTime,
  selectedLocations,
  toggleLocation,
  customLocation,
  setCustomLocation,
  addCustomLocation,
  totalCombinations,
  deadlineHours,
  setDeadlineHours,
  estimatedDeadline,
  isPending,
  onStartVoting,
}: PhaseIdleProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">투표 선택지를 구성하세요 (매트릭스 방식)</p>
          <p className="text-xs text-muted-foreground">
            원하는 날짜와 장소를 여러 개 선택하면 모든 조합이 자동으로 생성됩니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 날짜 선택 */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" /> 날짜 및 시간 선택
          </h4>
          <div className="border rounded-md p-3 bg-white">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={setSelectedDates}
              locale={ko}
              className="rounded-md w-full flex justify-center [&_.rdp-button_previous]:opacity-100 [&_.rdp-button_next]:opacity-100 [&_button]:visible"
              classNames={{
                today: 'text-indigo-600 font-bold ring-2 ring-offset-2 ring-indigo-400',
                selected:
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                day_button:
                  'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground',
              }}
            />
          </div>
          <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">기본 시간:</span>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="h-9 flex-1 px-2 rounded-md border border-input bg-background text-sm"
            >
              {TIME_PRESETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. 장소 선택 */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4" /> 장소 후보 선택
          </h4>

          {/* Quick Presets */}
          <div className="space-y-4">
            {SEOUL_HOTSPOTS.map((category) => (
              <div key={category.category} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{category.category}</p>
                <div className="flex flex-wrap gap-2">
                  {category.places.map((place) => {
                    const isSelected = selectedLocations.includes(place);
                    return (
                      <UnifiedButton
                        key={place}
                        variant={isSelected ? 'default' : 'outline-solid'}
                        size="sm"
                        onClick={() => toggleLocation(place)}
                        className={cn(
                          'h-8 px-3 text-xs transition-all font-normal',
                          isSelected ? 'ring-2 ring-primary/20' : 'hover:bg-gray-100'
                        )}
                      >
                        {place}
                        {isSelected && <CheckCircle className="w-3 h-3 ml-1.5" />}
                      </UnifiedButton>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Custom Input */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">직접 입력</p>
            <div className="flex gap-2">
              <Input
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomLocation()}
                placeholder="장소 직접 입력..."
                className="h-9"
              />
              <UnifiedButton onClick={addCustomLocation} size="sm" className="h-9">
                추가
              </UnifiedButton>
            </div>
          </div>

          {/* Selected Locations Chips */}
          {selectedLocations.length > 0 && (
            <div className="p-3 bg-blue-50/50 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                선택된 장소 ({selectedLocations.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedLocations.map((loc) => (
                  <Badge
                    key={loc}
                    variant="secondary"
                    className="pl-2 pr-1 py-0.5 text-xs bg-white border-blue-100 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors group"
                    onClick={() => toggleLocation(loc)}
                  >
                    {loc}
                    <XCircle className="w-3 h-3 ml-1 text-gray-400 group-hover:text-red-500" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Summary & Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
          <div className="space-y-1">
            <p className="text-sm font-medium">예상 생성 결과</p>
            <p className="text-xs text-muted-foreground">
              날짜 {selectedDates.length}개 × 장소 {selectedLocations.length}개 =
              <span className="font-bold text-primary"> 총 {totalCombinations}개 선택지</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">마감 시간:</span>
            <select
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(Number(e.target.value))}
              className="h-6 px-1 rounded border-none bg-transparent text-xs font-bold focus:ring-0 cursor-pointer"
            >
              <option value={6}>6시간</option>
              <option value={12}>12시간</option>
              <option value={24}>24시간</option>
              <option value={48}>48시간</option>
            </select>
            <span className="text-xs text-gray-400">({estimatedDeadline})</span>
          </div>
        </div>

        <UnifiedButton
          onClick={onStartVoting}
          disabled={isPending || totalCombinations === 0}
          loading={isPending}
          fullWidth
          className="h-11 text-base font-semibold shadow-lg shadow-primary/20"
        >
          투표 시작하기
        </UnifiedButton>
      </div>
    </div>
  );
}
