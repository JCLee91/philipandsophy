'use client';

import FooterActions from '@/components/FooterActions';

interface SubmissionLayoutProps {
  children: React.ReactNode;
  footer: React.ReactNode;
  /** @deprecated CSS app-footer로 대체됨. 키보드 대응 시에만 사용 */
  mainPaddingBottom?: number;
  /** @deprecated CSS app-footer로 대체됨. 키보드 대응 시에만 사용 */
  footerPaddingBottom?: string;
}

/**
 * Submit Step 화면의 내부 콘텐츠 레이아웃
 * - 상단/진행바는 app/submit/layout.tsx에서 처리됨
 * - 여기서는 메인 콘텐츠 영역과 하단 버튼(Footer)의 배치만 담당
 */
export default function SubmissionLayout({
  children,
  footer,
  mainPaddingBottom,
  footerPaddingBottom,
}: SubmissionLayoutProps) {
  // 키보드가 올라왔을 때만 동적 패딩 적용
  const hasKeyboardPadding = mainPaddingBottom && mainPaddingBottom > 32;
  const keyboardOffset = hasKeyboardPadding && mainPaddingBottom ? Math.max(0, mainPaddingBottom - 32) : 0;

  return (
    <div className="flex min-h-full flex-col">
      <main
        className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-6"
        style={hasKeyboardPadding ? { paddingBottom: mainPaddingBottom } : undefined}
      >
        {children}
      </main>

      {/* 하단 버튼 - FooterActions로 통일 */}
      {hasKeyboardPadding ? (
        // 키보드 올라왔을 때: 버튼이 키보드에 가려지지 않도록 offset 적용
        <div className="sticky z-40 border-t bg-white" style={{ bottom: keyboardOffset }}>
          <div
            className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 pt-4"
            style={{ paddingBottom: footerPaddingBottom }}
          >
            {footer}
          </div>
        </div>
      ) : (
        // 기본 상태: 스크롤 중에도 하단 버튼 고정 (Safe Area는 CSS app-footer로 처리)
        <div className="sticky z-40" style={{ bottom: keyboardOffset }}>
          <FooterActions maxWidth="xl">{footer}</FooterActions>
        </div>
      )}
    </div>
  );
}
