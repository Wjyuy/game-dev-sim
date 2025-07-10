// components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useState ,useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react'; // Sun, Moon 아이콘 추가
import Button from '../ui/Button';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 다크 모드 상태 관리 (선택 사항: useTheme 훅 등으로 전역 관리 가능)
  // 여기서는 단순히 시스템 테마를 따르도록 구현하므로 별도 상태는 불필요하지만,
  // 사용자가 수동으로 토글하는 기능을 추가하려면 useState가 필요합니다.
  // 예시를 위해 토글 버튼을 추가할 경우를 고려하여 구현합니다.
  const [isDarkMode, setIsDarkMode] = useState(false); // 초기값은 시스템 설정에 따라 결정될 수 있음

  // 테마 토글 함수
  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      if (isCurrentlyDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setIsDarkMode(false);
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setIsDarkMode(true);
      }
    }
  };

  // 컴포넌트 마운트 시 시스템 테마 또는 localStorage 설정에 따라 초기화
  useEffect(() => { // useState 대신 useEffect 사용
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (savedTheme === 'dark' || (savedTheme === null && prefersDark)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      }
    }
  }, []); // 의존성 배열을 비워두면 컴포넌트가 마운트될 때 한 번만 실행됩니다.

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Projects', href: '/projects' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="bg-white shadow-sm py-4 px-6 md:px-8 lg:px-12 fixed top-0 left-0 w-full z-50
                       dark:bg-gray-900 dark:border-b dark:border-gray-800 dark:shadow-lg"> {/* 다크 모드 스타일 추가 */}
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* 로고 / 사이트명 */}
        <Link href="/" className="text-2xl font-bold text-slate-900 hover:text-blue-600 transition-colors
                                   dark:text-gray-50 dark:hover:text-blue-400"> {/* 다크 모드 텍스트 색상 */}
          YourName.dev
        </Link>

        {/* 데스크톱 내비게이션 */}
        <nav className="hidden md:flex items-center space-x-6"> {/* items-center 추가 */}
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-slate-700 hover:text-blue-600 text-lg font-medium transition-colors
                         dark:text-gray-300 dark:hover:text-blue-400"
            >
              {link.name}
            </Link>
          ))}
          {/* 다크 모드 토글 버튼 (데스크톱) */}
          <Button
            variant="ghost"
            size="md"
            icon={isDarkMode ? Sun : Moon}
            onClick={toggleTheme}
            aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
            className="ml-4" // 마진 추가
          />
        </nav>

        {/* 모바일 메뉴 버튼 및 다크 모드 토글 버튼 */}
        <div className="md:hidden flex items-center space-x-2">
          {/* 다크 모드 토글 버튼 (모바일) */}
          <Button
            variant="ghost"
            size="md"
            icon={isDarkMode ? Sun : Moon}
            onClick={toggleTheme}
            aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          />
          <Button
            variant="ghost"
            size="md"
            icon={isMenuOpen ? X : Menu}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          />
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white bg-opacity-95 z-40 flex flex-col items-center justify-center space-y-8
                         dark:bg-gray-950 dark:bg-opacity-95"> {/* 다크 모드 배경색 */}
          <Button
            variant="ghost"
            size="md"
            icon={X}
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-6 right-6"
            aria-label="메뉴 닫기"
          />
          <nav className="flex flex-col space-y-6 text-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-slate-800 hover:text-blue-600 text-3xl font-semibold transition-colors
                           dark:text-gray-100 dark:hover:text-blue-400"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <Button
              variant="primary"
              size="lg"
              className="mt-8"
              onClick={() => {
                setIsMenuOpen(false);
                // 여기에 연락처 모달 열기 또는 연락처 페이지로 이동 로직 추가
              }}
            >
              Get in Touch
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;