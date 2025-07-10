// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Inter 폰트 임포트
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // <--- 이 부분 추가: CSS 변수로 폰트 설정
});

export const metadata: Metadata = {
  title: '김개발 - 풀스택 개발자',
  description: '4년차 풀스택 개발자 김개발의 이력서 페이지입니다. Next.js, TypeScript, Node.js 전문가.',
  keywords: ['풀스택 개발자', 'Next.js', 'TypeScript', 'React', 'Node.js', '개발자 이력서'],
  authors: [{ name: '김개발' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: '김개발 - 풀스택 개발자',
    description: '4년차 풀스택 개발자 김개발의 이력서 페이지',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable}`}> 
      <body>
        <Header />
        <main className="relative z-10 pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}