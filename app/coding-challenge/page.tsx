// app/coding-challenge/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/clientConfig'; // auth 임포트 추가
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'; // getDoc 추가
import { User } from 'firebase/auth'; // Firebase User 타입 임포트

import Button from '@/components/ui/Button'; // Button 컴포넌트
import Card from '@/components/ui/Card';     // Card 컴포넌트
import ProgressBar from '@/components/ui/ProgressBar'; 

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

const stages: Stage[] = [
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
  // TODO: 3~5단계 추가
  {
    id: 'stage-3',
    problem: '두 숫자를 더하는 함수 `add`를 정의하고 5와 3을 더한 결과를 출력하세요.',
    availableBlocks: [
      { id: 'func_add_params', label: 'function add(a, b) {', type: 'function' },
      { id: 'return_a_plus_b', label: '  return a + b;', type: 'statement' },
      { id: 'curly_brace_close', label: '}', type: 'statement' },
      { id: 'console_log_add_5_3', label: 'console.log(add(5, 3));', type: 'statement' },
      { id: 'let_result', label: 'let result;', type: 'variable' },
    ],
    correctOrder: ['func_add_params', 'return_a_plus_b', 'curly_brace_close', 'console_log_add_5_3'],
  },
  {
    id: 'stage-4',
    problem: '배열 `fruits`를 선언하고 "apple", "banana"를 넣은 뒤, 첫 번째 요소를 출력하세요.',
    availableBlocks: [
      { id: 'let_fruits_array', label: 'let fruits = ["apple", "banana"];', type: 'variable' },
      { id: 'console_log_fruits_0', label: 'console.log(fruits[0]);', type: 'statement' },
      { id: 'fruits_push', label: 'fruits.push("orange");', type: 'statement' },
      { id: 'let_i', label: 'let i = 0;', type: 'variable' },
    ],
    correctOrder: ['let_fruits_array', 'console_log_fruits_0'],
  },
  {
    id: 'stage-5',
    problem: '`for` 루프를 사용하여 0부터 2까지의 숫자를 출력하세요.',
    availableBlocks: [
      { id: 'for_loop_init', label: 'for (let i = 0;', type: 'statement' },
      { id: 'loop_condition', label: 'i < 3;', type: 'statement' },
      { id: 'loop_increment', label: 'i++) {', type: 'statement' },
      { id: 'console_log_i', label: '  console.log(i);', type: 'statement' },
      { id: 'curly_brace_close', label: '}', type: 'statement' },
      { id: 'while_true', label: 'while (true) {', type: 'statement' },
    ],
    correctOrder: ['for_loop_init', 'loop_condition', 'loop_increment', 'console_log_i', 'curly_brace_close'],
  },
];


export default function CodingChallengePage() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [draggedItem, setDraggedItem] = useState<CodeBlock | null>(null);
  const [droppedBlocks, setDroppedBlocks] = useState<CodeBlock[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [score, setScore] = useState(0);
  
  // ⭐ Firebase Auth 연동을 위한 userId 상태 추가 ⭐
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // 초기 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 상태

  const router = useRouter();

  const currentStage = stages[currentStageIndex];
  const progress = ((currentStageIndex + 1) / stages.length) * 100;

  // ⭐ Firebase Auth 상태 변경 리스너 ⭐
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        setLoading(false); // 로딩 완료
        // 사용자가 로그인되면 현재 코딩 챌린지 진행 상황을 로드
        loadCodingProgress(currentUser.uid);
      } else {
        setUserId(null);
        setLoading(false); // 로딩 완료
        setError("로그인이 필요합니다."); // 임시 에러 메시지
        router.replace('/login'); // 로그인 페이지로 리다이렉트
      }
    });

    return () => unsubscribe();
  }, [router]); // router는 useCallback의 의존성이므로 여기에 추가

  // ⭐ 사용자 코딩 진행 상황 로드 함수 ⭐
  const loadCodingProgress = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.codingProgress) {
          setCurrentStageIndex(data.codingProgress.currentStage || 0);
          setScore(data.codingProgress.score || 0);
          // completed 상태도 필요하다면 로드
          if (data.codingProgress.completed) {
            setFeedback('모든 코딩 챌린지를 이미 완료했습니다! 디자인 스튜디오로 이동합니다.');
            setTimeout(() => router.push('/design-studio'), 1500);
          }
        }
      }
    } catch (err) {
      console.error("코딩 진행 상황 로드 실패:", err);
      setError("코딩 진행 상황을 불러오는 데 실패했습니다.");
    }
  }, [router]);


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
    if (!userId) {
      alert("로그인 정보가 없습니다. 다시 로그인 해주세요.");
      router.push('/login');
      return;
    }

    const userOrder = droppedBlocks.map(block => block.id);
    const isCorrect = JSON.stringify(userOrder) === JSON.stringify(currentStage.correctOrder);

    let newScore = score;
    let newFeedback = '';

    if (isCorrect) {
      newFeedback = '성공! 다음 단계로 넘어갑니다.';
      newScore = score + 10; // 점수 추가
      setScore(newScore);
      
      // Firebase에 진행 상황 업데이트
      try {
        const userDocRef = doc(db, 'users', userId);
        const nextStageIndex = currentStageIndex + 1;
        const isCompleted = nextStageIndex >= stages.length;

        await updateDoc(userDocRef, {
          currentStep: isCompleted ? 4 : 3, // 모든 챌린지 완료 시 다음 단계로, 아니면 코딩 챌린지 단계 유지
          'codingProgress.currentStage': nextStageIndex,
          'codingProgress.score': newScore,
          'codingProgress.completed': isCompleted, // 완료 여부 저장
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Firebase 업데이트 실패:", error);
        setFeedback("진행 상황 저장 실패.");
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
      newFeedback = '실패! 다시 시도해보세요. (야근 포인트 획득...)';
      // TODO: 야근 포인트 증가 로직 추가 (필요하다면 Firebase userData에 반영)
      setDroppedBlocks([]); // 실패 시 블록 초기화
      setTimeout(() => setFeedback(''), 1500);
    }
    setFeedback(newFeedback);
  };

  // 블록 초기화
  const handleReset = () => {
    setDroppedBlocks([]);
    setFeedback('');
  };

  // ⭐ 로딩 및 에러 상태 UI ⭐
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        로그인 상태 확인 및 데이터 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 text-xl text-center">
        오류: {error}
        {error.includes("로그인이 필요합니다") && (
          <Button onClick={() => router.push('/login')} className="mt-4">
            로그인 페이지로
          </Button>
        )}
      </div>
    );
  }

  if (!userId) { // userId가 없으면 로그인 유도 (로딩 후에도)
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        로그인이 필요합니다.
        <Button onClick={() => router.push('/login')} className="mt-4">로그인 페이지로</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">코딩 챌린지: 버그 사냥꾼</h1>
      <ProgressBar progress={progress} />
      <p className="text-center text-gray-600 mt-2 dark:text-gray-400">
        스테이지 {currentStageIndex + 1} / {stages.length} | 점수: {score}
      </p>

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
                draggable={true}
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
        <Button onClick={handleExecuteCode} className="mr-4" disabled={droppedBlocks.length === 0 || loading}>
          {loading ? '실행 중...' : '코드 실행!'}
        </Button>
        <Button onClick={handleReset} variant="secondary" disabled={loading}>
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
