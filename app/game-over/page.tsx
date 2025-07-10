// app/game-over/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/clientConfig'; // auth 임포트 추가
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth'; // Firebase User 타입 임포트

// UI 컴포넌트 임포트 (필요하다면 Button, Card 등을 활용)
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// 데이터 타입 임포트
import { UserGameProgress } from '@/types/game';

export default function GameOverPage() {
  const router = useRouter();
  // TODO: 실제 userId (Firebase Auth 연동) -> 이제 Firebase Auth에서 가져옵니다.
  const [userId, setUserId] = useState<string | null>(null); // userId 상태 추가

  const [userData, setUserData] = useState<UserGameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>("알 수 없는 이유로 게임 오버");

  // Firebase Auth 상태 변경 리스너
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
      } else {
        setUserId(null);
        setUserData(null); // 사용자 데이터 초기화
        setLoading(false); // 로딩 상태 해제
        setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
        router.replace('/login'); // 실제 로그인 페이지 경로로 변경
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserData = useCallback(async () => {
    if (!userId) {
      // userId가 아직 설정되지 않았다면 (예: onAuthStateChanged가 완료되지 않음) 바로 리턴
      // 이 경우 loading 상태는 onAuthStateChanged가 처리하도록 둠
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserGameProgress;
        setUserData(data);
        
        // 게임 오버 이유 확인 (예: 자금 부족)
        if (data.resources.money <= 0 && data.gameDevProgress.currentWeek > 0) {
          setGameOverReason("자금이 모두 소진되어 더 이상 개발을 진행할 수 없습니다.");
        } else {
          // 게임 오버가 아닌 경우 (예: 직접 URL 접근)
          setError("게임 오버 상태가 아닙니다. 개발 페이지로 이동합니다.");
          setTimeout(() => router.replace('/game-simulation'), 2000);
          return;
        }

      } else {
        setError("사용자 데이터를 찾을 수 없습니다. 처음부터 다시 시작해주세요.");
        router.push('/character-creation'); // 데이터가 없으면 첫 단계로 이동
      }
    } catch (err: any) { // err 타입 지정
      console.error("게임 오버 데이터 로드 실패:", err);
      setError("게임 오버 정보를 불러오는 데 실패했습니다: " + err.message);
      // router.push('/character-creation'); // 에러 발생 시 첫 단계로 이동
    } finally {
      setLoading(false);
    }
  }, [userId, router]); // userId를 의존성 배열에 추가

  useEffect(() => {
    if (userId) { // userId가 유효할 때만 데이터를 가져오도록
      fetchUserData();
    }
  }, [userId, fetchUserData]); // userId도 의존성 배열에 추가

  const handleRestartGame = async () => {
    if (!userId) {
      setError("로그인 정보가 없어 게임을 재시작할 수 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 0, // 첫 단계로 초기화
        totalScore: 0,
        resources: { money: 10000, energy: 100 }, // 초기 자원
        gameDevProgress: {
          currentWeek: 0,
          coding: { percentage: 0, bugs: 0 },
          art: { percentage: 0 },
          design: { percentage: 0 },
          marketing: { percentage: 0 },
          quality: 0,
          isReleased: false,
          releaseRevenue: 0,
        },
        team: [], // 팀원 초기화
        overallProgress: 0,
        genre: { selected: null, marketDataSnapshot: {} }, // 장르 초기화
        codingProgress: { currentStage: 0, score: 0, completed: false }, // 코딩 챌린지 초기화
        designProgress: { selectedPalette: null, selectedBackground: null, placedObjects: [], score: 0, completed: false }, // 디자인 초기화
        updatedAt: serverTimestamp(),
      });
      router.push('/character-creation'); // 게임 시작 페이지로 이동
    } catch (err: any) { // err 타입 지정
      console.error("게임 재시작 실패:", err);
      setError("게임 재시작에 실패했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 로딩 및 에러 상태 UI
  if (loading && !userData) { // userData가 null일 때만 전체 로딩 메시지 표시
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        게임 오버 정보 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 text-xl text-center">
        오류: {error}
        {error.includes("개발 페이지로 이동") && (
          <Button onClick={() => router.replace('/game-simulation')} className="mt-4">
            개발 페이지로 돌아가기
          </Button>
        )}
        {error.includes("로그인이 필요합니다") && (
            <Button onClick={() => router.replace('/login')} className="mt-4">
              로그인 페이지로
            </Button>
        )}
         {error.includes("사용자 데이터를 찾을 수 없습니다") && (
            <Button onClick={() => router.replace('/character-creation')} className="mt-4">
              새 게임 시작
            </Button>
        )}
      </div>
    );
  }

  if (!userId) { // userId가 없으면 로그인 유도
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        로그인이 필요합니다.
        <Button onClick={() => router.push('/login')} className="mt-4">로그인 페이지로</Button>
      </div>
    );
  }

  // userData가 최종적으로 없으면 (fetch 실패 등)
  if (!userData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        게임 데이터를 불러올 수 없습니다.
        <Button onClick={() => router.push('/character-creation')} className="mt-4">새 게임 시작</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 text-center min-h-screen flex flex-col justify-center items-center">
      <h1 className="text-5xl font-extrabold mb-8 text-red-600 animate-bounce">
        GAME OVER
      </h1>

      <Card className="max-w-xl w-full p-8 shadow-2xl dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-3xl font-bold mb-4 dark:text-white">아쉽게도 게임 개발이 중단되었습니다.</h2>
        </Card.Header>
        <Card.Body className="space-y-4">
          <p className="text-xl text-gray-800 dark:text-gray-300">
            이유: <span className="font-semibold text-red-500">{gameOverReason}</span>
          </p>
          {userData && userData.resources.money <= 0 && (
            <p className="text-lg text-gray-700 dark:text-gray-400">
              현재 자금: <span className="font-bold text-red-500">${userData.resources.money.toLocaleString()}</span>
            </p>
          )}
          {userData && (
            <p className="text-lg text-gray-700 dark:text-gray-400">
              진행된 주차: <span className="font-bold">{userData.gameDevProgress.currentWeek}주차</span>
            </p>
          )}
          <p className="text-lg text-gray-700 dark:text-gray-400">
            실패는 성공의 어머니! 다음에는 더 나은 전략을 세워보세요!
          </p>
        </Card.Body>
      </Card>

      <div className="mt-10">
        <Button onClick={handleRestartGame} className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-lg px-8 py-3">
          새 게임 시작
        </Button>
      </div>
    </div>
  );
}