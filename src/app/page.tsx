'use client';

import Script from 'next/script';
import '../styles/landing.css';

export default function LandingPage() {
  return (
    <>
      {/* Meta Pixel Code */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1365426628495741');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img height="1" width="1" style={{display:'none'}}
        src="https://www.facebook.com/tr?id=1365426628495741&ev=PageView&noscript=1"
        />
      </noscript>

      {/* Google tag (gtag.js) */}
      <Script async src="https://www.googletagmanager.com/gtag/js?id=G-EKZ9VRV269" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-EKZ9VRV269');
        `}
      </Script>

      {/* JSON-LD Structured Data */}
      <Script id="json-ld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Philip & Sophy",
          "description": "깊이 있는 대화가 설레는 만남으로",
          "url": "https://www.philipandsophy.kr/",
          "sameAs": ["https://smore.im/form/13J1nUevrX"]
        })}
      </Script>

      {/* SEO 최적화를 위한 숨김 텍스트 */}
      <div className="seo-content">
        <h1>필립앤소피 | 승인제 독서소셜클럽</h1>
        <p>깊이 있는 대화가 설레는 만남으로. 품격, 진정성, 그리고 설렘을 추구하는 25-40세 직장인과 전문직을 위한 승인제 독서소셜클럽입니다.</p>

        <h2>3가지 NO 철학으로 차별화된 소셜클럽</h2>
        <p>NO 스몰토크 - 필립앤소피만의 방식으로 깊이 있는 대화를 나눕니다.</p>
        <p>NO 억지 텐션 - 편안한 분위기 속에서 자연스럽게 관계를 발전시킵니다.</p>
        <p>NO 일회성 만남 - 나와 같이 맞는 오래갈 인연을 발견할 수 있습니다.</p>

        <h2>EXCLUSIVE PROGRAM - 만남을 기다리면서 시작하는 설렘</h2>
        <p>서울에서 진행되는 2주간 온라인 독서 프로그램입니다.</p>
        <ul>
            <li>선별된 20명의 멤버가 함께하는 2주간 격주 프로그램</li>
            <li>2주간 각자 책을 읽고 감상을 공유</li>
            <li>책 읽기를 인증하고 멤버들의 견해를 나누기</li>
            <li>온라인에서 친해진 후 오프라인 파티에서 직접 만나기</li>
        </ul>

        <h3>매력적인 사람은 책을 읽습니다</h3>
        <p>2주간 각자 선택한 책을 읽고 감상을 공유합니다. 완독 부담 없이 책을 펴는 순간을 응원합니다.</p>

        <h3>성취와 대화를 즐길 수 있습니다</h3>
        <p>2주간 함께한 사람들과 자연스럽게 깊은 대화를 나눌 수 있습니다.</p>

        <h3>지속할 수 있는 관계로 연결됩니다</h3>
        <p>일회성 만남이 아닌, 지속 가능한 인간관계를 만들 수 있습니다.</p>

        <h2>MEMBERS ONLY! 필립앤소피 프로그램 안내</h2>
        <p>프로그램은 승인제로 운영되며 설문과 10분 전화 인터뷰를 통해 승인 여부가 결정됩니다.</p>
        <p>Invitation Only - 생각이 통하는 인연을 만나는 곳 필립앤소피로 당신을 초대합니다.</p>
        <p>10월의 필립앤소피 - 12만원에서 9만원(25% 할인, 2주 프로그램)</p>

        <h3>프로그램 일정 (2025년 10월)</h3>
        <p>10월 9일 - 모집 마감일 전까지 결제를 완료해 주세요</p>
        <p>10월 11일 - 온라인 OT가 진행됩니다</p>
        <p>10월 13일~24일 - 프로그램에서 자연스럽게 서로를 알아가요</p>
        <p>10월 25일 - 멤버들과 클로징 파티를 즐겨요</p>

        <h3>프로그램 구성</h3>
        <p>온라인 독서 프로그램 → 승인된 멤버와의 교류 → 즐거운 클로징 파티 → 다음 기수 프로그램 참여 연결</p>
        <p>10월 클로징 파티는 서울의 프리미엄 공간에서 개최되며 식사 및 주류가 무제한으로 제공됩니다.</p>

        <h3>서울 소셜클럽 네트워킹 독서모임</h3>
        <p>더 이상 소극적인 만남에 시간을 낭비하지 마세요. 당신의 매력을 아는 사람들 속에서 가장 빛날 기회입니다.</p>
        <p>필립앤소피에서 대화의 깊이와 설렘을 경험하세요. 25-40세 직장인 전문직 승인제 멤버십 클럽입니다.</p>
      </div>

      <div className="container">
        <img src="/image/PnS_1.webp?v=1.1" alt="필립앤소피(P&S) 승인제 독서소셜클럽 - 깊이 있는 대화가 설레는 만남으로" className="main-image" fetchPriority="high" />

        <img src="/image/PnS_2.webp?v=1.5" alt="필립앤소피 소셜클럽 소개" className="main-image" fetchPriority="high" loading="eager" />

        <img src="/image/PnS_3.webp?v=1.3" alt="필립앤소피 서비스 특징" className="main-image" />

        <img src="/image/PnS_4_nofooter.webp?v=2.2" alt="필립앤소피 가입 안내" className="main-image" />

        <div className="cta-section">
          <a
            href="https://smore.im/form/13J1nUevrX"
            target="_blank"
            rel="noopener"
            aria-label="사전 신청 설문 열기"
            className="cta-button"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).fbq) {
                (window as any).fbq('track', 'CompleteRegistration', {content_name: '사전신청폼'});
              }
            }}
          >
            <span className="cta-text">10월의 필립앤소피 참여하기</span>
            <div className="cta-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </a>
        </div>
      </div>

      {/* 푸터 영역 */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-left">
              <div className="footer-header">
                <h3 className="footer-title">필립앤소피</h3>
                <div className="footer-sns">
                  <a
                    href="kakaoplus://plusfriend/chat/_QPNUn"
                    onClick={(e) => {
                      if (typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                        e.preventDefault();
                        window.open('http://pf.kakao.com/_QPNUn/chat', '_blank');
                      }
                    }}
                    aria-label="카카오톡에서 문의하기"
                    className="sns-button kakao-button"
                  >
                    <img src="/image/kakao.webp?v=1.1" alt="카카오톡 채널" className="sns-icon" />
                    <span>문의하기</span>
                  </a>
                  <a
                    href="https://www.instagram.com/philip_and_sophy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="인스타그램 팔로우하기"
                    className="sns-button instagram-button"
                  >
                    <svg className="sns-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                    <span>인스타그램</span>
                  </a>
                </div>
              </div>
              <div className="footer-info">
                <p>대표: 이종찬</p>
                <p>사업자등록번호: 641-01-02451</p>
                <p>주소: 서울특별시 중구 을지로 264, 12층 스파크플러스 1213호</p>
              </div>
            </div>
          </div>

          {/* 푸터 하단 네비게이션 */}
          <div className="footer-bottom">
            <div className="footer-nav">
              <a href="https://philipandsophy.notion.site/10-27679c8ade7980faace7d0e2076e4570" target="_blank" rel="noopener" className="footer-nav-link">About</a>
              <span className="footer-divider">•</span>
              <a href="https://philipandsophy.notion.site/FAQ-27679c8ade7980909527fe9606c05af3" target="_blank" rel="noopener" className="footer-nav-link">FAQ</a>
              <span className="footer-divider">•</span>
              <a href="/privacy-policy.html" target="_blank" rel="noopener" className="footer-nav-link">개인정보처리방침</a>
              <span className="footer-divider">•</span>
              <a href="/terms-of-service.html" target="_blank" rel="noopener" className="footer-nav-link">이용약관</a>
            </div>
            <div className="footer-copyright">
              <p>&copy; 2025 필립앤소피. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Vercel Analytics */}
      <Script defer src="/_vercel/speed-insights/script.js" />
      <Script defer src="/_vercel/insights/script.js" />
    </>
  );
}
