'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Notice } from '@/types/database';

type NoticeDialogControls = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

type NoticeWriteDialogState = NoticeDialogControls & {
  content: string;
  setContent: (value: string) => void;
  resetContent: () => void;
};

type NoticeEditDialogState = NoticeDialogControls & {
  notice: Notice | null;
  content: string;
  setContent: (value: string) => void;
  openWithNotice: (notice: Notice) => void;
};

type NoticeDeleteDialogState = {
  notice: Notice | null;
  openWithNotice: (notice: Notice) => void;
  close: () => void;
  isOpen: boolean;
};

export function useNoticeDialogs() {
  const [isWriteOpen, setWriteOpen] = useState(false);
  const [newNoticeContent, setNewNoticeContent] = useState('');

  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editContent, setEditContent] = useState('');
  const isEditOpen = useMemo(() => !!editingNotice, [editingNotice]);

  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);

  const openWrite = useCallback(() => setWriteOpen(true), []);
  const closeWrite = useCallback(() => setWriteOpen(false), []);
  const resetWriteContent = useCallback(() => setNewNoticeContent(''), []);

  const openEdit = useCallback((notice: Notice) => {
    setEditingNotice(notice);
    setEditContent(notice.content);
  }, []);
  const closeEdit = useCallback(() => {
    setEditingNotice(null);
    setEditContent('');
  }, []);

  const openDelete = useCallback((notice: Notice) => setDeleteTarget(notice), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  const writeDialog: NoticeWriteDialogState = {
    isOpen: isWriteOpen,
    open: openWrite,
    close: closeWrite,
    content: newNoticeContent,
    setContent: setNewNoticeContent,
    resetContent: resetWriteContent,
  };

  const editDialog: NoticeEditDialogState = {
    isOpen: isEditOpen,
    open: () => {}, // No-op: use openWithNotice instead
    close: closeEdit,
    notice: editingNotice,
    content: editContent,
    setContent: setEditContent,
    openWithNotice: openEdit,
  };

  const deleteDialog: NoticeDeleteDialogState = {
    notice: deleteTarget,
    openWithNotice: openDelete,
    close: closeDelete,
    isOpen: deleteTarget !== null,
  };

  return {
    writeDialog,
    editDialog,
    deleteDialog,
  };
}

export type NoticeDialogsState = ReturnType<typeof useNoticeDialogs>;
