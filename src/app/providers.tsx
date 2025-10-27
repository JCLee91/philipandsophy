// In Next.js, this file would be called: app/providers.tsx
'use client';

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, lazy, Suspense } from 'react';
import { initializeFirebase } from '@/lib/firebase';
import { CACHE_TIMES } from '@/constants/cache';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { PushNotificationRefresher } from '@/components/PushNotificationRefresher';
import ServiceWorkerUpdateListener from '@/components/pwa/ServiceWorkerUpdateListener';

// Lazy load React Query Devtools (프로덕션 번들에서 완전 제외)
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((mod) => ({
          default: mod.ReactQueryDevtools,
        }))
      )
    : () => null;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        // 정적 데이터(cohort/participants) 기본 캐시: 10분
        // 동적 데이터(notices/messages)는 개별 hook에서 override
        staleTime: CACHE_TIMES.STATIC, // 10분

        // gcTime: 캐시 유지 시간 (메모리에서 삭제되기 전)
        // staleTime보다 길게 설정하여 재방문 시 즉시 표시
        gcTime: 15 * 60 * 1000, // 15분 (기본값: 5분)
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  // Initialize Firebase on client side
  useEffect(() => {
    initializeFirebase();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ServiceWorkerUpdateListener />
          <PushNotificationRefresher />
          {children}
          <Toaster />
          {/* React Query Devtools - lazy load (프로덕션 번들 제외) */}
          {process.env.NODE_ENV === 'development' && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )}
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
