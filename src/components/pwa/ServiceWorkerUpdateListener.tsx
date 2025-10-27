'use client';

import { useEffect } from 'react';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

type ServiceWorkerActivatedDetail = {
  version?: string;
};

export default function ServiceWorkerUpdateListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleActivated = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerActivatedDetail>;
      const version = customEvent.detail?.version;

      toast({
        title: '앱이 새로 업데이트되었습니다',
        description: '새로운 기능을 적용하려면 새로고침해 주세요.',
        action: (
          <ToastAction altText="새로고침" onClick={() => window.location.reload()}>
            새로고침
          </ToastAction>
        ),
      });

      if (version) {
        console.info('[ServiceWorkerUpdateListener] Activated version:', version);
      }
    };

    window.addEventListener('pns-sw-activated', handleActivated as EventListener);

    return () => {
      window.removeEventListener('pns-sw-activated', handleActivated as EventListener);
    };
  }, [toast]);

  return null;
}
