// components/layout/Navigation.tsx
'use client'; // 클라이언트 컴포넌트임을 명시

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // 현재 경로를 알기 위해 사용

interface NavigationProps {
  isMobile?: boolean; // 모바일/데스크톱 스타일 구분을 위함
  onLinkClick?: () => void; // 모바일 메뉴에서 링크 클릭 시 메뉴 닫기 위함
}

const Navigation: React.FC<NavigationProps> = ({ isMobile = false, onLinkClick }) => {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Projects', href: '/projects' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <nav className={isMobile ? "flex flex-col space-y-6 text-center" : "flex space-x-6"}>
      {navLinks.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className={`
            ${isMobile ? 'text-slate-800 text-3xl font-semibold' : 'text-slate-700 text-lg font-medium'}
            hover:text-blue-600 transition-colors
            ${pathname === link.href ? 'text-blue-600 font-bold' : ''}
          `}
          onClick={onLinkClick} // 모바일 메뉴에서 클릭 시 콜백 실행
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );
};

export default Navigation;