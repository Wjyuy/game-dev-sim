// app/coding-challenge/page.tsx (간략화된 예시)
'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/clientConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Button from '@/components/ui/Button'; // Button 컴포넌트
import Card from '@/components/ui/Card';     // Card 컴포넌트

// ProgressBar 컴포넌트 (나중에 components/ui/ProgressBar.tsx 로 분리)
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
    <div
      className="bg-blue-600 h-4 rounded-full transition-all duration-300"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

// 코드 블록 타입 정의
interface CodeBlock {
  id: string;
  label: string;
  type: 'variable' | 'statement' | 'function' | 'operator';
}
interface Stage {
  id: string;
  problem: string;
  availableBlocks: CodeBlock[]; // 명시적으로 CodeBlock 배열임을 지정
  correctOrder: string[];
}

const stages: Stage[] = [ // 🔥🔥🔥 여기에 Stage[] 타입을 명시합니다 🔥🔥🔥
  {
    id: 'stage-1',
    problem: '콘솔에 "Hello World!"를 출력하세요.',
    availableBlocks: [
      { id: 'log_hello', label: 'console.log("Hello World!")', type: 'statement' },
      { id: 'let_x', label: 'let x = 0;', type: 'variable' },
      { id: 'plus_one', label: '+ 1', type: 'operator' },
    ],
    correctOrder: ['log_hello'],
  },
  {
    id: 'stage-2',
    problem: '변수 `num`에 10을 할당하고, `num` 값을 출력하세요.',
    availableBlocks: [
      { id: 'log_num', label: 'console.log(num)', type: 'statement' },
      { id: 'let_num_10', label: 'let num = 10;', type: 'variable' },
      { id: 'add_func', label: 'function add(a,b)', type: 'function' },
    ],
    correctOrder: ['let_num_10', 'log_num'],
  },
  // ... 3~5단계 추가
];
export default function CodingChallengePage() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [draggedItem, setDraggedItem] = useState<CodeBlock | null>(null);
  const [droppedBlocks, setDroppedBlocks] = useState<CodeBlock[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [score, setScore] = useState(0);
  const router = useRouter();
  const userId = "test_user_id"; // TODO: 실제 userId 가져오기

  const currentStage = stages[currentStageIndex];
  const progress = ((currentStageIndex + 1) / stages.length) * 100;

  // 드래그 시작 시
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, block: CodeBlock) => {
    setDraggedItem(block);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id); // 드래그 데이터 설정 (옵션)
  };

  // 드롭 영역 위로 드래그 중
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // 기본 동작 방지 (드롭 가능하게 함)
    e.dataTransfer.dropEffect = 'move';
  };

  // 드롭 시
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedItem) {
      setDroppedBlocks((prev) => [...prev, draggedItem]);
      setDraggedItem(null); // 드롭 후 드래그 아이템 초기화
    }
  };

  // 코드 실행 버튼 클릭 시
  const handleExecuteCode = async () => {
    const userOrder = droppedBlocks.map(block => block.id);
    const isCorrect = JSON.stringify(userOrder) === JSON.stringify(currentStage.correctOrder);

    if (isCorrect) {
      setFeedback('성공! 다음 단계로 넘어갑니다.');
      setScore(prev => prev + 10); // 점수 추가
      
      // Firebase에 진행 상황 업데이트
      try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          currentStep: 3, // 코딩 챌린지 단계
          'codingProgress.currentStage': currentStageIndex + 1,
          'codingProgress.score': score + 10,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Firebase 업데이트 실패:", error);
      }

      setTimeout(() => {
        if (currentStageIndex < stages.length - 1) {
          setCurrentStageIndex(prev => prev + 1);
          setDroppedBlocks([]); // 다음 스테이지를 위해 블록 초기화
          setFeedback('');
        } else {
          setFeedback('모든 코딩 챌린지를 완료했습니다!');
          alert('모든 코딩 챌린지를 완료했습니다! 디자인 스튜디오로 이동합니다.');
          router.push('/design-studio'); // 모든 스테이지 완료 후 다음 페이지로 이동
        }
      }, 1500);

    } else {
      setFeedback('실패! 다시 시도해보세요. (야근 포인트 획득...)');
      // 여기에 야근 포인트 증가 로직 추가
      setDroppedBlocks([]); // 실패 시 블록 초기화
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  // 블록 초기화
  const handleReset = () => {
    setDroppedBlocks([]);
    setFeedback('');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">코딩 챌린지: 버그 사냥꾼</h1>
      <ProgressBar progress={progress} />
      <p className="text-center text-gray-600 mt-2 dark:text-gray-400">스테이지 {currentStageIndex + 1} / {stages.length}</p>

      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">문제:</h2>
        </Card.Header>
        <Card.Body>
          <p className="text-xl text-gray-800 dark:text-gray-200">{currentStage.problem}</p>
        </Card.Body>
      </Card>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* 제공되는 코드 블록 */}
        <div className="flex-1 bg-gray-100 p-4 rounded-lg shadow-inner dark:bg-gray-700">
          <h3 className="text-xl font-semibold mb-4 dark:text-white">사용 가능한 코드 블록</h3>
          <div className="grid grid-cols-2 gap-4">
            {currentStage.availableBlocks.map((block) => (
              <Card
                key={block.id}
                className="bg-white p-3 text-center cursor-grab dark:bg-gray-600 dark:text-white"
                draggable={true} // 
                onDragStart={(e) => handleDragStart(e, block)}
              >
                {block.label}
              </Card>
            ))}
          </div>
        </div>

        {/* 코드 작성 영역 (드롭 존) */}
        <div
          className="flex-1 bg-white p-4 rounded-lg shadow-md border-2 border-dashed border-gray-300 min-h-[200px] flex flex-col gap-2 dark:bg-gray-800 dark:border-gray-600"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <h3 className="text-xl font-semibold mb-2 dark:text-white">코드를 여기에 드롭하세요</h3>
          {droppedBlocks.length === 0 && <p className="text-gray-400">블록을 드래그하여 배치하세요.</p>}
          {droppedBlocks.map((block, index) => (
            <Card key={index} className="bg-blue-100 p-2 border-l-4 border-blue-500 dark:bg-blue-900 dark:text-white">
              {block.label}
            </Card>
          ))}
        </div>
      </div>

      <div className="text-center mb-6">
        <Button onClick={handleExecuteCode} className="mr-4" disabled={droppedBlocks.length === 0}>
          코드 실행!
        </Button>
        <Button onClick={handleReset} variant="secondary">
          초기화
        </Button>
      </div>

      {feedback && (
        <p className={`text-center text-lg font-semibold ${feedback.includes('성공') ? 'text-green-600' : 'text-red-600'} dark:text-white`}>
          {feedback}
        </p>
      )}
    </div>
  );
}