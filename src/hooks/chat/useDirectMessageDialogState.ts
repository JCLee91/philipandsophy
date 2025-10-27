'use client';

import { useCallback, useState } from 'react';
import type { Participant } from '@/types/database';

type OpenDirectMessageOptions = {
  participant: Participant;
};

export function useDirectMessageDialogState() {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<Participant | null>(null);

  const openWithParticipant = useCallback(({ participant }: OpenDirectMessageOptions) => {
    setTarget(participant);
    setIsOpen(true);
  }, []);

  const openWithAdmin = useCallback((adminParticipant: Participant) => {
    setTarget(adminParticipant);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTarget(null);
  }, []);

  const setOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setIsOpen(true);
      } else {
        close();
      }
    },
    [close]
  );

  return {
    isOpen,
    target,
    setOpen,
    openWithParticipant,
    openWithAdmin,
    close,
  };
}
