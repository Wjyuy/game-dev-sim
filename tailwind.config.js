// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // <--- 이 부분 추가: HTML 태그에 'dark' 클래스 유무로 다크모드 제어
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 커스텀 색상 팔레트 정의 (Tailwind 기본 색상 확장 또는 오버라이드)
        // 여기에 프로젝트 전반에서 사용할 색상을 정의합니다.
        // 예를 들어, 'primary' 색상을 정의하고 싶다면:
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // 이 색상이 Button primary의 기본이 될 수 있습니다.
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // 다른 유용한 색상들 (예: slate, gray, blue 등 Tailwind 기본에서 조금 더 확장)
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        gray: { // 다크모드 배경색 등을 위해 gray를 추가합니다.
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        blue: { // Button primary에 사용된 blue를 명확히 정의
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Header의 Button primary에 사용된 색상
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        red: { // Button destructive에 사용된 red를 명확히 정의
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626', // Button destructive에 사용된 색상
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // CSS 변수를 참조하는 컬러는 그대로 유지 (body 배경/글자색)
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        // Inter 폰트를 위한 새로운 변수 정의 (next/font 사용)
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'], // Inter 폰트 추가
        mono: ['var(--font-geist-mono)', 'monospace'], // 기존 폰트는 유지 (필요하다면)
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}