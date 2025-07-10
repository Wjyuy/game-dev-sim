// app/game-release/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/clientConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

// UI 컴포넌트 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';

// 데이터 타입 임포트
import { UserGameProgress } from '@/types/game';

export default function GameReleasePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [userData, setUserData] = useState<UserGameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releaseResult, setReleaseResult] = useState<{
    finalQuality: number;
    estimatedRevenue: number;
    reviews: string;
    message: string;
  } | null>(null);

  // Firebase Auth 상태 변경 리스너
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
      } else {
        setUserId(null);
        setUserData(null);
        setLoading(false);
        setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserData = useCallback(async () => {
    if (!userId) {
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

        if (!data.gameDevProgress?.isReleased) {
          setError("아직 게임이 출시되지 않았습니다. 개발 페이지로 이동합니다.");
          setTimeout(() => router.replace('/game-simulation'), 2000);
          return;
        }

        const finalQuality = data.gameDevProgress.quality;
        // releaseRevenue가 undefined일 경우를 대비하여 0을 기본값으로 설정
        const releaseRevenue = data.gameDevProgress.releaseRevenue || 0; 

        let reviews = "";
        let message = "";

        if (finalQuality >= 90 && data.gameDevProgress.coding.bugs <= 0) {
          reviews = "🌟🌟🌟🌟🌟 완벽한 걸작! 비평가와 유저 모두 극찬했습니다!";
          message = "당신은 게임 개발의 전설이 되었습니다. 엄청난 성공입니다!";
        } else if (finalQuality >= 70 && data.gameDevProgress.coding.bugs < 5) {
          reviews = "🌟🌟🌟🌟 명작 탄생! 약간의 버그가 있었지만, 팬들을 열광시켰습니다.";
          message = "대성공입니다! 시장에 큰 영향을 미쳤습니다.";
        } else if (finalQuality >= 50 && data.gameDevProgress.coding.bugs < 10) {
          reviews = "🌟🌟🌟 수작! 잠재력은 충분했지만, 개선의 여지가 보입니다.";
          message = "괜찮은 성과입니다. 다음 작품이 기대됩니다.";
        } else if (finalQuality >= 30) {
          reviews = "🌟🌟 평작! 평이 좋지 않았지만, 소수의 팬들에게는 호평받았습니다.";
          message = "시장이 냉정했군요. 다음에는 더 나은 전략이 필요합니다.";
        } else {
          reviews = "🌟 졸작! 버그 투성이의 실패작입니다.";
          message = "뼈아픈 실패입니다. 하지만 실패는 성공의 어머니입니다!";
        }

        if (data.gameDevProgress.coding.bugs > 0 && finalQuality >= 70) {
            reviews += " (다만, 잔존 버그가 아쉽다는 평이 있습니다.)";
        }
        if (data.gameDevProgress.coding.bugs >= 10) {
            reviews = "🚨 버그 지옥! 출시 전 QA가 시급했습니다.";
            message = "너무 서둘러 출시한 결과입니다. 다음에는 더 신중해야 합니다.";
        }

        setReleaseResult({
          finalQuality: finalQuality,
          estimatedRevenue: releaseRevenue, // 여기에 저장된 releaseRevenue를 할당하는 것이 맞습니다.
          reviews: reviews,
          message: message,
        });

      } else {
        setError("사용자 데이터를 찾을 수 없습니다. 처음부터 다시 시작해주세요.");
        router.push('/character-creation');
      }
    } catch (err: any) {
      console.error("게임 출시 데이터 로드 및 계산 실패:", err);
      setError("게임 출시 결과를 불러오는 데 실패했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId, fetchUserData]);

  const handleRestartGame = async () => {
    if (!userId) {
      setError("로그인 정보가 없어 게임을 재시작할 수 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 0,
        totalScore: 0,
        resources: { money: 10000, energy: 100 },
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
        team: [],
        overallProgress: 0,
        genre: { selected: null, marketDataSnapshot: {} },
        codingProgress: { currentStage: 0, score: 0, completed: false },
        designProgress: { selectedPalette: null, selectedBackground: null, placedObjects: [], score: 0, completed: false },
        updatedAt: serverTimestamp(),
      });
      router.push('/character-creation');
    } catch (err: any) {
      console.error("게임 재시작 실패:", err);
      setError("게임 재시작에 실패했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  if (loading && !userData) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        게임 출시 결과 불러오는 중...
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

  if (!userId) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        로그인이 필요합니다.
        <Button onClick={() => router.push('/login')} className="mt-4">로그인 페이지로</Button>
      </div>
    );
  }

  if (!userData || !releaseResult) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        결과를 표시할 수 없습니다. 데이터를 확인하거나 새로 시작해주세요.
        <Button onClick={() => router.push('/character-creation')} className="mt-4">새 게임 시작</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 text-center min-h-screen flex flex-col justify-center items-center">
      <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse">
        게임 출시!
      </h1>

      <Card className="max-w-3xl w-full p-8 shadow-2xl dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-3xl font-bold mb-4 dark:text-white">당신의 게임, "{userData.genre.selected || '알 수 없는'}"의 결과는?</h2>
        </Card.Header>
        <Card.Body className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold dark:text-gray-200">최종 게임 품질</h3>
            <ProgressBar 
              progress={releaseResult.finalQuality} 
              barColorClass={releaseResult.finalQuality >= 70 ? "bg-green-500" : releaseResult.finalQuality >= 40 ? "bg-yellow-500" : "bg-red-500"} 
            />
            <p className="text-xl font-bold mt-2 dark:text-white">{releaseResult.finalQuality.toFixed(1)}점</p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold dark:text-gray-200">순수익</h3>
            {/* game-simulation에서 이미 계산된 releaseRevenue를 가져오므로, 여기서 지출을 다시 뺄 필요 없음 */}
            <p className="text-4xl font-extrabold text-green-500 my-2">${releaseResult.estimatedRevenue.toLocaleString()}</p>
            {/* 이전 계산 로직 주석 처리 (불필요해짐) */}
            {/* <p className="text-gray-600 dark:text-gray-400">(총 지출을 제외한 수익)</p> */}
          </div>

          <div>
            <h3 className="text-2xl font-semibold dark:text-gray-200">언론/유저 평가</h3>
            <p className="text-xl italic text-gray-800 dark:text-gray-300">"{releaseResult.reviews}"</p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold dark:text-gray-200">개발팀의 한 마디</h3>
            <p className="text-lg text-gray-700 dark:text-gray-300">{releaseResult.message}</p>
          </div>
        </Card.Body>
      </Card>

      <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={handleRestartGame} className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-lg px-8 py-3">
          새 게임 시작
        </Button>
      </div>
    </div>
  );
}