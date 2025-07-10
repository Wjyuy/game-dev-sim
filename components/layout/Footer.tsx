// components/layout/Footer.tsx

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-800 text-white py-8 px-6 md:px-8 lg:px-12
                       dark:bg-gray-900 dark:text-gray-300"> {/* 다크 모드 스타일 추가 */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-center md:text-left">
        <p className="text-sm">
          &copy; {currentYear} Your Name. All rights reserved.
        </p>
        <div className="flex space-x-4 mt-4 md:mt-0">
          {/* 소셜 미디어 아이콘 링크 (dark:text-gray-400 dark:hover:text-blue-300 추가 가능) */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;