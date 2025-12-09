'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLandingConfig } from '@/lib/firebase/landing';
import { DEFAULT_LANDING_CONFIG, LandingConfig } from '@/types/landing';

/**
 * 랜딩 페이지 설정을 로드하고 CTA 링크를 계산하는 훅
 *
 * @returns config - 랜딩 페이지 설정 (로딩 중이면 null)
 * @returns loading - 로딩 상태
 * @returns getHref - 현재 설정에 따른 CTA 링크 반환 함수
 */
export function useLandingConfig() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLandingConfig()
      .then(setConfig)
      .catch(() => setConfig(DEFAULT_LANDING_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  /**
   * 현재 설정에 따른 CTA 버튼 링크 반환
   * - OPEN + INTERNAL: /application
   * - OPEN + EXTERNAL: externalUrl
   * - CLOSED + EXTERNAL_WAITLIST: externalUrl
   * - CLOSED + INTERNAL_WAITLIST: /waitlist
   * - CLOSED + NONE: # (이동 안 함)
   */
  const getHref = useCallback(() => {
    if (!config) return '/application';

    if (config.status === 'OPEN') {
      return config.openFormType === 'EXTERNAL' ? config.externalUrl : '/application';
    }

    // CLOSED 상태
    if (config.closedFormType === 'EXTERNAL_WAITLIST') return config.externalUrl;
    if (config.closedFormType === 'INTERNAL_WAITLIST') return '/waitlist';
    return '#';
  }, [config]);

  return { config, loading, getHref };
}
