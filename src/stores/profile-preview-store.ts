'use client';

import { create } from 'zustand';

interface ProfilePreviewState {
  allowedIds: string[];
  setAllowedIds: (ids: string[]) => void;
  hasAccess: (participantId: string | null | undefined) => boolean;
}

export const useProfilePreviewStore = create<ProfilePreviewState>((set, get) => ({
  allowedIds: [],
  setAllowedIds: (ids: string[]) => set({ allowedIds: ids }),
  hasAccess: (participantId) => {
    if (!participantId) return false;
    return get().allowedIds.includes(participantId);
  },
}));
