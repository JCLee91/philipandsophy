'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes (30분에서 단축 - 백그라운드 복귀 문제 대응)
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute check interval
const SW_READY_TIMEOUT_MS = 5000; // 5초 타임아웃 (무한 대기 방지)

/**
 * AppLifecycleManager
 *
 * Handles app resume (background -> foreground) logic:
 * 1. Detects when the app becomes visible again.
 * 2. If enough time has passed (5 mins), invalidates critical queries.
 * 3. Checks for service worker updates (new version).
 */
export function AppLifecycleManager() {
    const queryClient = useQueryClient();
    const lastActiveTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                const timeSinceLastActive = now - lastActiveTimeRef.current;

                logger.info(`[AppLifecycle] App resumed. Inactive for: ${Math.round(timeSinceLastActive / 1000)}s`);

                // If inactive for more than threshold, refresh data
                if (timeSinceLastActive > REFRESH_THRESHOLD_MS) {
                    logger.info('[AppLifecycle] Threshold exceeded, refreshing critical data...');

                    // 1. Invalidate Participant Data
                    await queryClient.invalidateQueries({ queryKey: ['participant'] });

                    // 2. Invalidate Notices/DMs if applicable
                    await queryClient.invalidateQueries({ queryKey: ['notices'] });
                    await queryClient.invalidateQueries({ queryKey: ['chat'] });

                    // 3. Check for SW update (with timeout to prevent infinite wait)
                    if ('serviceWorker' in navigator) {
                        const swTimeout = setTimeout(() => {
                            logger.warn('[AppLifecycle] SW ready timeout - skipping update check');
                        }, SW_READY_TIMEOUT_MS);

                        navigator.serviceWorker.ready
                            .then(registration => {
                                clearTimeout(swTimeout);
                                registration.update();
                                logger.info('[AppLifecycle] SW update check triggered');
                            })
                            .catch(error => {
                                clearTimeout(swTimeout);
                                logger.error('[AppLifecycle] SW ready error:', error);
                            });
                    }
                }

                lastActiveTimeRef.current = now;
            } else {
                // App goes to background
                lastActiveTimeRef.current = Date.now();
            }
        };

        // Initial timestamp
        lastActiveTimeRef.current = Date.now();

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Periodic check (optional, for long-running foreground sessions)
        const intervalId = setInterval(() => {
            // Update timestamp to prevent "stale" lastActiveTime if user keeps app open
            if (document.visibilityState === 'visible') {
                lastActiveTimeRef.current = Date.now();
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
        };
    }, [queryClient]);

    return null; // Headless component
}
