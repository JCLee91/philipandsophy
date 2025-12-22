'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function GlassNavigation() {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: '홈', href: '/' },
    {
      label: '프로그램',
      href: '/programs/reading',
      subItems: [
        { label: '2주 독서', href: '/programs/reading' },
        { label: '멤버십', href: '/programs/membership' },
      ],
    },
    { label: '가격', href: '/pricing' },
    { label: '후기', href: '/reviews' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleItemClick = (e: React.MouseEvent, item: any) => {
    if (item.subItems) {
      e.preventDefault();
      setOpenSubmenu(openSubmenu === item.label ? null : item.label);
    } else {
      setOpenSubmenu(null);
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="glass-nav">
        <div className="nav-container">
          <div className="nav-tabs">
            {navItems.map((item) => (
              <div key={item.href} className={`nav-item-wrapper ${openSubmenu === item.label ? 'active' : ''}`}>
                <Link
                  href={item.href}
                  className={`nav-tab ${isActive(item.href) ? 'nav-tab-active' : ''}`}
                  onClick={(e) => handleItemClick(e, item)}
                >
                  {item.label}
                </Link>
                {item.subItems && (
                  <div className="nav-dropdown">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.label}
                        href={subItem.href}
                        className="nav-dropdown-item"
                        onClick={() => setOpenSubmenu(null)}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="glass-nav-mobile">
        <div className="nav-mobile-container">
          <button
            className="nav-mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {isMobileMenuOpen && (
            <div className="nav-mobile-menu">
              {navItems.map((item) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-mobile-item ${isActive(item.href) ? 'nav-mobile-item-active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.subItems && (
                    <div style={{ paddingLeft: '20px' }}>
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          className="nav-mobile-item"
                          style={{ fontSize: '14px', padding: '10px 20px' }}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
