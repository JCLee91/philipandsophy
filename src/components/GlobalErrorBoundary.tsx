'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    isChunkError: boolean;
}

// 무한 새로고침 방지를 위한 상수
const RELOAD_COUNT_KEY = 'pns-error-reload-count';
const RELOAD_TIMESTAMP_KEY = 'pns-error-reload-timestamp';
const MAX_RELOADS = 3;
const RELOAD_WINDOW_MS = 60 * 1000; // 1분 내 3회 제한

/**
 * Global Error Boundary
 *
 * Catches render errors in the component tree and displays a fallback UI.
 * specifically handles "ChunkLoadError" by automatically reloading the page,
 * which often happens after a new deployment when old chunks are missing.
 *
 * 무한 새로고침 방지:
 * - 1분 내 최대 3회까지만 자동 새로고침
 * - 3회 초과 시 사용자에게 수동 새로고침 요청
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        isChunkError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        const isChunkError = error.message?.includes('Loading chunk') || error.name === 'ChunkLoadError';
        return { hasError: true, error, isChunkError };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[GlobalErrorBoundary] Uncaught error:', error, errorInfo);

        // Auto-reload on ChunkLoadError (deployment updates) with reload limit
        if (error.message?.includes('Loading chunk') || error.name === 'ChunkLoadError') {
            console.log('[GlobalErrorBoundary] ChunkLoadError detected');

            try {
                const now = Date.now();
                const lastTimestamp = parseInt(localStorage.getItem(RELOAD_TIMESTAMP_KEY) || '0', 10);
                let reloadCount = parseInt(localStorage.getItem(RELOAD_COUNT_KEY) || '0', 10);

                // 1분이 지났으면 카운터 리셋
                if (now - lastTimestamp > RELOAD_WINDOW_MS) {
                    reloadCount = 0;
                }

                if (reloadCount < MAX_RELOADS) {
                    // 카운터 증가 및 저장
                    localStorage.setItem(RELOAD_COUNT_KEY, String(reloadCount + 1));
                    localStorage.setItem(RELOAD_TIMESTAMP_KEY, String(now));
                    console.log(`[GlobalErrorBoundary] Auto-reloading (attempt ${reloadCount + 1}/${MAX_RELOADS})...`);
                    window.location.reload();
                } else {
                    // 최대 횟수 초과 - 사용자에게 수동 새로고침 요청
                    console.log('[GlobalErrorBoundary] Max reload attempts reached, showing manual reload UI');
                    // 카운터 리셋 (다음 시도를 위해)
                    localStorage.removeItem(RELOAD_COUNT_KEY);
                    localStorage.removeItem(RELOAD_TIMESTAMP_KEY);
                }
            } catch (e) {
                // localStorage 접근 실패 시 그냥 새로고침
                console.log('[GlobalErrorBoundary] localStorage error, reloading anyway...');
                window.location.reload();
            }
        }
    }

    public componentDidMount() {
        // 성공적인 렌더링 시 새로고침 카운터 리셋
        try {
            localStorage.removeItem(RELOAD_COUNT_KEY);
            localStorage.removeItem(RELOAD_TIMESTAMP_KEY);
        } catch (e) {
            // ignore
        }
    }

    private handleReload = () => {
        // Clear potentially stale cache before reloading
        try {
            // Optional: Clear specific localStorage items if needed
            // localStorage.removeItem('some-key');
        } catch (e) {
            // ignore
        }
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            // ChunkError (버전 불일치)에 대한 특별 UI
            if (this.state.isChunkError) {
                return (
                    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                        <div className="mb-6 rounded-full bg-blue-100 p-4 dark:bg-blue-900/20">
                            <RefreshCw className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="mb-2 text-2xl font-bold tracking-tight">
                            앱이 업데이트되었습니다
                        </h1>
                        <p className="mb-8 max-w-xs text-muted-foreground">
                            새 버전이 있습니다.
                            <br />
                            새로고침하여 최신 버전을 사용해주세요.
                        </p>
                        <Button onClick={this.handleReload} size="lg" className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            새로고침
                        </Button>
                    </div>
                );
            }

            // 일반 에러 UI
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                    <div className="mb-6 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
                        <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold tracking-tight">
                        일시적인 오류가 발생했습니다
                    </h1>
                    <p className="mb-8 max-w-xs text-muted-foreground">
                        앱을 실행하는 도중 문제가 발생했습니다.
                        <br />
                        잠시 후 다시 시도해주세요.
                    </p>
                    <Button onClick={this.handleReload} size="lg" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        앱 다시 불러오기
                    </Button>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-8 max-w-md overflow-auto rounded bg-slate-950 p-4 text-left text-xs text-slate-50">
                            <p className="font-mono text-red-400">{this.state.error.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
