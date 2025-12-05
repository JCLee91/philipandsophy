'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDatacntrStore } from '@/stores/datacntr-store';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import type { Cohort } from '@/types/database';

interface NoticeData {
  id: string;
  cohortId: string;
  title?: string;
  content: string;
  status?: 'draft' | 'published' | 'scheduled';
  scheduledAt?: { _seconds: number; _nanoseconds: number };
  imageUrl?: string;
}

interface UseNoticeFormOptions {
  mode: 'create' | 'edit';
  noticeId?: string;
  templateId?: string;
}

export function useNoticeForm({ mode, noticeId, templateId }: UseNoticeFormOptions) {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedCohortId: storeCohortId } = useDatacntrStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('published');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [templateImageUrl, setTemplateImageUrl] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledHour, setScheduledHour] = useState('09');
  const [scheduledMinute, setScheduledMinute] = useState('00');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [editCohortId, setEditCohortId] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const selectedCohortId = mode === 'edit' ? editCohortId : storeCohortId;
  const needsCohortSelection = mode === 'create' && !storeCohortId;
  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId) || null;

  // Load cohorts
  useEffect(() => {
    if (!user) return;
    fetchWithTokenRefresh('/api/datacntr/cohorts')
      .then((res) => res.ok && res.json())
      .then((data) => data && setCohorts(data))
      .catch((e) => logger.error('Failed to fetch cohorts:', e))
      .finally(() => mode === 'create' && !templateId && setIsLoading(false));
  }, [user, mode, templateId]);

  // Load template (create mode)
  useEffect(() => {
    if (mode !== 'create' || !templateId || !user) return;
    fetchWithTokenRefresh(`/api/datacntr/notice-templates/${templateId}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((t) => { setContent(t.content); t.imageUrl && (setImagePreview(t.imageUrl), setTemplateImageUrl(t.imageUrl)); })
      .catch(() => alert('템플릿을 불러오는데 실패했습니다.'))
      .finally(() => setIsLoading(false));
  }, [mode, templateId, user]);

  // Load notice (edit mode)
  useEffect(() => {
    if (mode !== 'edit' || !noticeId || !user) return;
    fetchWithTokenRefresh(`/api/datacntr/notices/${noticeId}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((n: NoticeData) => {
        setEditCohortId(n.cohortId);
        setTitle(n.title || '');
        setContent(n.content);
        setStatus(n.status || 'published');
        if (n.imageUrl) { setExistingImageUrl(n.imageUrl); setImagePreview(n.imageUrl); }
        if (n.status === 'scheduled' && n.scheduledAt) {
          setIsScheduled(true);
          const d = new Date(n.scheduledAt._seconds * 1000);
          setScheduledDate(d.toISOString().slice(0, 10));
          setScheduledHour(String(d.getHours()).padStart(2, '0'));
          setScheduledMinute(String(Math.round(d.getMinutes() / 10) * 10 % 60).padStart(2, '0'));
        }
      })
      .catch(() => { alert('공지를 불러오는데 실패했습니다.'); router.push('/datacntr/notices'); })
      .finally(() => setIsLoading(false));
  }, [mode, noticeId, user, router]);

  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('이미지 크기는 5MB 이하여야 합니다.'); return; }
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 업로드 가능합니다.'); return; }
    setImageFile(file);
    setTemplateImageUrl('');
    setExistingImageUrl('');
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview('');
    setTemplateImageUrl('');
    setExistingImageUrl('');
  }, []);

  const handleScheduleToggle = useCallback((checked: boolean) => {
    setIsScheduled(checked);
    if (checked && !scheduledDate) {
      const next = new Date();
      next.setHours(next.getHours() + 1, 0);
      setScheduledDate(next.toISOString().slice(0, 10));
      setScheduledHour(String(next.getHours()).padStart(2, '0'));
      setScheduledMinute('00');
    }
  }, [scheduledDate]);

  const handleSubmit = useCallback(async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!selectedCohortId) { alert('기수를 먼저 선택해주세요.'); return; }
    if (!content.trim()) { alert('공지 내용을 입력해주세요.'); return; }
    if (isScheduled && !scheduledDate) { alert('예약 발행 날짜를 설정해주세요.'); return; }
    if (!user) return;

    if (mode === 'edit' && status === 'draft' && !isDraft && !isScheduled) {
      if (!confirm('임시저장된 공지를 발행하시겠습니까?\n\n발행 시 모든 유저에게 푸시 알림이 전송됩니다.')) return;
    }

    isDraft ? setIsDrafting(true) : null;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('cohortId', selectedCohortId);
      title.trim() && formData.append('title', title.trim());
      formData.append('content', content.trim());

      if (isScheduled && !isDraft) {
        formData.append('status', 'scheduled');
        formData.append('scheduledAt', new Date(`${scheduledDate}T${scheduledHour}:${scheduledMinute}:00`).toISOString());
      } else {
        formData.append('status', isDraft ? 'draft' : 'published');
      }

      if (imageFile) formData.append('image', imageFile);
      else if (mode === 'create' && templateImageUrl) formData.append('templateImageUrl', templateImageUrl);
      else if (mode === 'edit' && existingImageUrl) formData.append('existingImageUrl', existingImageUrl);

      const res = await fetchWithTokenRefresh(
        mode === 'create' ? '/api/datacntr/notices/create' : `/api/datacntr/notices/${noticeId}`,
        { method: mode === 'create' ? 'POST' : 'PUT', body: formData }
      );
      if (!res.ok) throw new Error((await res.json()).error || '공지 저장 실패');

      alert(isDraft ? '공지가 임시저장되었습니다.' : isScheduled ? '공지가 예약되었습니다.' : mode === 'create' ? '공지가 발행되었습니다.' : '공지가 수정되었습니다.');
      router.push('/datacntr/notices');
    } catch (err) {
      alert(err instanceof Error ? err.message : '공지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      setIsDrafting(false);
    }
  }, [selectedCohortId, content, isScheduled, scheduledDate, user, mode, status, title, scheduledHour, scheduledMinute, imageFile, templateImageUrl, existingImageUrl, noticeId, router]);

  return {
    title, setTitle, content, setContent, imagePreview, handleImageChange, handleRemoveImage,
    isScheduled, setIsScheduled, scheduledDate, setScheduledDate, scheduledHour, setScheduledHour,
    scheduledMinute, setScheduledMinute, handleScheduleToggle, handleSubmit, isSubmitting, isDrafting,
    status, isLoading, needsCohortSelection, selectedCohort, selectedCohortId,
  };
}
