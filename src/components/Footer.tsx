'use client';

export default function Footer() {
  return (
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
  );
}
