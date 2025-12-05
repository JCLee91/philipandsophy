'use client';

import { ChangeEvent } from 'react';
import Image from 'next/image';
import { Upload, X, Users } from 'lucide-react';
import type { Cohort } from '@/types/database';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  imagePreview: string;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  isScheduled: boolean;
  onScheduleToggle: (checked: boolean) => void;
  scheduledDate: string;
  setScheduledDate: (v: string) => void;
  scheduledHour: string;
  setScheduledHour: (v: string) => void;
  scheduledMinute: string;
  setScheduledMinute: (v: string) => void;
  selectedCohort: Cohort | null;
  cohortId: string | null;
  cohortLabel: string;
  cohortHelpText: string;
}

export function NoticeFormFields({
  title, setTitle, content, setContent, imagePreview, onImageChange, onRemoveImage,
  isScheduled, onScheduleToggle, scheduledDate, setScheduledDate,
  scheduledHour, setScheduledHour, scheduledMinute, setScheduledMinute,
  selectedCohort, cohortId, cohortLabel, cohortHelpText,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Cohort display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">{cohortLabel}</p>
            <p className="text-lg font-bold text-gray-900">{selectedCohort?.name || cohortId}</p>
          </div>
        </div>
        <p className="text-xs text-blue-500 mt-2">{cohortHelpText}</p>
      </div>

      {/* Push notification title */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <label className="block text-sm font-medium text-gray-900 mb-2">푸시 알림 제목 (선택)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="푸시 알림에 표시될 제목을 입력하세요 (미입력 시 기본값 사용)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500 mt-2">* 채팅방에는 표시되지 않으며, 푸시 알림과 관리자 목록에서만 확인 가능합니다.</p>
      </div>

      {/* Notice content */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <label className="block text-sm font-medium text-gray-900 mb-2">공지 내용 <span className="text-red-500">*</span></label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="공지 내용을 입력하세요..."
          rows={10}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          required
        />
        <p className="text-sm text-gray-500 mt-2">현재 {content.length}자</p>
      </div>

      {/* Image upload */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <label className="block text-sm font-medium text-gray-900 mb-2">이미지 첨부 (선택)</label>
        {!imagePreview ? (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <div className="flex flex-col items-center justify-center py-6">
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">클릭하여 이미지 업로드</p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (최대 5MB)</p>
            </div>
            <input type="file" accept="image/*" onChange={onImageChange} className="hidden" />
          </label>
        ) : (
          <div className="relative aspect-[3/2] w-full">
            <Image
              src={imagePreview}
              alt="미리보기"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="rounded-lg border border-gray-200 object-contain"
            />
            <button type="button" onClick={onRemoveImage} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Schedule settings */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-gray-900">예약 발행 설정</label>
          <div className="flex items-center">
            <input type="checkbox" id="isScheduled" checked={isScheduled} onChange={(e) => onScheduleToggle(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="isScheduled" className="ml-2 text-sm text-gray-700">나중에 발행하기</label>
          </div>
        </div>
        {isScheduled && (
          <div className="mt-2 space-y-2">
            <label className="block text-sm text-gray-600">발행 예정 시간</label>
            <div className="flex gap-2">
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <select value={scheduledHour} onChange={(e) => setScheduledHour(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{i}시</option>)}
              </select>
              <select value={scheduledMinute} onChange={(e) => setScheduledMinute(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {['00', '10', '20', '30', '40', '50'].map((m) => <option key={m} value={m}>{m}분</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500">* 10분 단위로 예약 발행됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
