'use client';

import TopBar from '@/components/TopBar';
import ProgressIndicator from '@/components/submission/ProgressIndicator';
import PageTransition from '@/components/PageTransition';
import FooterActions from '@/components/FooterActions';

interface SubmissionLayoutProps {
  currentStep: 1 | 2 | 3;
  onBack: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** @deprecated CSS app-footer로 대체됨. 키보드 대응 시에만 사용 */
  mainPaddingBottom?: number;
  /** @deprecated CSS app-footer로 대체됨. 키보드 대응 시에만 사용 */
  footerPaddingBottom?: string;
}

/**
 * Submit Step 1/2/3 공통 레이아웃
 * - TopBar + ProgressIndicator
 * - PageTransition 래퍼
 * - app-shell + app-main-content 구조
 * - FooterActions로 통일된 하단 버튼 영역
 */
export default function SubmissionLayout({
  currentStep,
  onBack,
  children,
  footer,
  mainPaddingBottom,
  footerPaddingBottom,
}: SubmissionLayoutProps) {
  // 키보드가 올라왔을 때만 동적 패딩 적용
  const hasKeyboardPadding = mainPaddingBottom && mainPaddingBottom > 32;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-background">
        <TopBar onBack={onBack} title="독서 인증하기" align="left" />
        <div className="fixed top-14 left-0 right-0 z-[998]">
          <ProgressIndicator currentStep={currentStep} />
        </div>

        <main
          className="app-main-content flex-1 overflow-y-auto pt-[57px]"
          style={hasKeyboardPadding ? { paddingBottom: mainPaddingBottom } : undefined}
        >
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-6">
            {children}
          </div>
        </main>

        {/* 하단 버튼 - FooterActions로 통일 */}
        {hasKeyboardPadding ? (
          // 키보드 올라왔을 때: 동적 패딩
          <div className="border-t bg-white">
            <div
              className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 pt-4"
              style={{ paddingBottom: footerPaddingBottom }}
            >
              {footer}
            </div>
          </div>
        ) : (
          // 기본 상태: FooterActions 사용 (CSS로 Safe Area 처리)
          <FooterActions maxWidth="xl">
            {footer}
          </FooterActions>
        )}
      </div>
    </PageTransition>
  );
}
