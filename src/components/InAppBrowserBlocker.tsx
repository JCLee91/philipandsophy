'use client';

import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';

type InAppBrowserType = 'kakaotalk' | 'instagram' | 'facebook' | 'naver' | 'line' | 'other' | null;

interface InAppBrowserInfo {
  type: InAppBrowserType;
  name: string;
  instruction: string;
}

const BROWSER_INFO: Record<Exclude<InAppBrowserType, null>, InAppBrowserInfo> = {
  kakaotalk: {
    type: 'kakaotalk',
    name: '카카오톡',
    instruction: '우측 하단 ⋮ → 다른 브라우저로 열기',
  },
  instagram: {
    type: 'instagram',
    name: '인스타그램',
    instruction: '우측 상단 ⋮ → 브라우저에서 열기',
  },
  facebook: {
    type: 'facebook',
    name: '페이스북',
    instruction: '우측 하단 ⋮ → 브라우저에서 열기',
  },
  naver: {
    type: 'naver',
    name: '네이버',
    instruction: '우측 상단 ⋮ → 브라우저에서 열기',
  },
  line: {
    type: 'line',
    name: '라인',
    instruction: '우측 상단 ⋮ → 브라우저에서 열기',
  },
  other: {
    type: 'other',
    name: '인앱 브라우저',
    instruction: '메뉴에서 "브라우저에서 열기"를 선택해주세요',
  },
};

function detectInAppBrowser(): InAppBrowserType {
  if (typeof window === 'undefined') return null;

  const ua = navigator.userAgent.toLowerCase();

  // 카카오톡
  if (ua.includes('kakaotalk')) return 'kakaotalk';

  // 인스타그램
  if (ua.includes('instagram')) return 'instagram';

  // 페이스북
  if (ua.includes('fban') || ua.includes('fbav')) return 'facebook';

  // 네이버
  if (ua.includes('naver')) return 'naver';

  // 라인
  if (ua.includes('line/')) return 'line';

  // 기타 인앱 브라우저 감지 (WebView 패턴)
  // Android WebView
  if (ua.includes('wv') && ua.includes('android')) return 'other';

  // iOS WebView (Safari 엔진이지만 Safari가 아닌 경우)
  if (
    (ua.includes('iphone') || ua.includes('ipad')) &&
    !ua.includes('safari') &&
    ua.includes('applewebkit')
  ) {
    return 'other';
  }

  return null;
}

function openInExternalBrowser() {
  const currentUrl = window.location.href;
  const ua = navigator.userAgent.toLowerCase();

  // Android: intent 스킴 사용
  if (ua.includes('android')) {
    // Chrome intent
    const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
    return;
  }

  // iOS: Safari로 열기 시도 (제한적)
  // iOS에서는 직접 Safari를 열 수 없어서 안내만 가능
  if (ua.includes('iphone') || ua.includes('ipad')) {
    // 일부 앱에서는 x-safari-https:// 스킴이 동작
    window.location.href = `x-safari-https://${currentUrl.replace(/^https?:\/\//, '')}`;
    return;
  }
}

interface InAppBrowserBlockerProps {
  children: React.ReactNode;
}

export default function InAppBrowserBlocker({ children }: InAppBrowserBlockerProps) {
  const [browserType, setBrowserType] = useState<InAppBrowserType>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const detected = detectInAppBrowser();
    setBrowserType(detected);
    setIsChecking(false);
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenExternal = () => {
    openInExternalBrowser();
  };

  // 체크 중이거나 인앱 브라우저가 아니면 정상 렌더링
  if (isChecking || browserType === null) {
    return <>{children}</>;
  }

  const info = BROWSER_INFO[browserType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md text-center">
        {/* 아이콘 */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <ExternalLink className="h-10 w-10 text-gray-600" />
        </div>

        {/* 제목 */}
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          외부 브라우저로 열어주세요
        </h1>

        {/* 설명 */}
        <p className="mb-6 text-gray-600">
          {info.name} 내 브라우저에서는 일부 기능이
          <br />
          정상적으로 동작하지 않을 수 있습니다.
        </p>

        {/* 안내 박스 */}
        <div className="mb-6 rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            {info.instruction}
          </p>
        </div>

        {/* 버튼들 */}
        <div className="space-y-3">
          {/* 외부 브라우저로 열기 (Android에서만 효과적) */}
          <button
            onClick={handleOpenExternal}
            className="w-full rounded-lg bg-black px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
          >
            외부 브라우저로 열기
          </button>

          {/* URL 복사 */}
          <button
            onClick={handleCopyUrl}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="h-5 w-5 text-green-600" />
                복사 완료!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                URL 복사하기
              </>
            )}
          </button>
        </div>

        {/* 추가 안내 */}
        <p className="mt-6 text-xs text-gray-400">
          Chrome, Safari 등 기본 브라우저에서
          <br />
          접속하시면 모든 기능을 이용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
