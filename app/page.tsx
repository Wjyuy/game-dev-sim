'use client';

import { useState } from 'react';
import { Download, Github, ExternalLink, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

export default function UIComponentsExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-8 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Button 예시 */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Button 컴포넌트</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 기본 버튼들 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700">기본 스타일</h3>
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="destructive">Destructive Button</Button>
            </div>

            {/* 아이콘 버튼들 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700">아이콘 버튼</h3>
              <Button variant="primary" icon={Download} iconPosition="left">
                Download CV
              </Button>
              <Button variant="outline" icon={Github} iconPosition="left">
                View GitHub
              </Button>
              <Button variant="secondary" icon={ExternalLink} iconPosition="right">
                Visit Site
              </Button>
            </div>

            {/* 사이즈 & 상태 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700">사이즈 & 상태</h3>
              <Button size="sm">Small Button</Button>
              <Button size="md">Medium Button</Button>
              <Button size="lg">Large Button</Button>
              <Button loading>Loading...</Button>
              <Button fullWidth>Full Width</Button>
            </div>
          </div>
        </section>

        {/* Card 예시 */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Card 컴포넌트</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 기본 카드 */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-slate-800">기본 카드</h3>
              </Card.Header>
              <Card.Body>
                <p className="text-slate-600">
                  기본적인 카드 컴포넌트입니다. 헤더, 바디, 푸터를 포함할 수 있습니다.
                </p>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="outline">더 보기</Button>
              </Card.Footer>
            </Card>

            {/* 호버 효과 카드 */}
            <Card hover>
              <Card.Header>
                <h3 className="text-lg font-semibold text-slate-800">호버 카드</h3>
              </Card.Header>
              <Card.Body>
                <p className="text-slate-600">
                  마우스를 올리면 호버 효과가 적용되는 카드입니다.
                </p>
              </Card.Body>
            </Card>

            {/* 클릭 가능한 카드 */}
            <Card 
              hover 
              onClick={() => setIsModalOpen(true)}
              className="cursor-pointer"
            >
              <Card.Header>
                <h3 className="text-lg font-semibold text-slate-800">클릭 카드</h3>
              </Card.Header>
              <Card.Body>
                <p className="text-slate-600">
                  클릭하면 모달이 열리는 카드입니다.
                </p>
              </Card.Body>
            </Card>

            {/* 프로젝트 카드 예시 */}
            <Card hover shadow="md">
              <Card.Body>
                <div className="aspect-video bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  포트폴리오 프로젝트
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Next.js와 TypeScript로 개발한 반응형 웹 애플리케이션
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                    Next.js
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                    TypeScript
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                    Tailwind
                  </span>
                </div>
                <div className="flex justify-between">
                  <Button size="sm" variant="outline" icon={Github}>
                    코드
                  </Button>
                  <Button size="sm" variant="primary" icon={ExternalLink}>
                    데모
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </section>

        {/* Modal 트리거 버튼 */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Modal 컴포넌트</h2>
          <div className="space-x-4">
            <Button onClick={() => setIsModalOpen(true)} icon={Mail}>
              연락처 모달 열기
            </Button>
          </div>
        </section>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="연락처 정보"
          size="md"
        >
          <Modal.Body>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <span>dev@example.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Github className="w-5 h-5 text-slate-600" />
                <span>github.com/developer</span>
              </div>
              <p className="text-slate-600">
                포트폴리오를 확인해주셔서 감사합니다. 
                언제든지 연락 주시면 빠르게 답변드리겠습니다!
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              닫기
            </Button>
            <Button variant="primary" icon={Mail}>
              이메일 보내기
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
    </div>
  );
}