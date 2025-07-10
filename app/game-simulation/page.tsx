// app/game-simulation/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/clientConfig'; // Firebase Auth 인스턴스 임포트
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth'; // Firebase User 타입 임포트

// UI 컴포넌트 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';

// 데이터 타입 임포트
import { TeamMember } from '@/types/team';
import { UserGameProgress } from '@/types/game';

type FocusArea = 'coding' | 'art' | 'design' | 'marketing' | 'bugFixing' | 'rest';

// 랜덤 이벤트 데이터 (예시)
const randomEvents = [
  {
    id: 'synergy_boost',
    type: 'positive',
    message: "팀 시너지 폭발! 모든 진행도에 보너스!",
    effect: {
      coding: { percentage: 5 }, art: { percentage: 5 }, design: { percentage: 5 }, marketing: { percentage: 5 },
      energyBoost: 10
    }
  },
  {
    id: 'critical_bug',
    type: 'negative',
    message: "치명적인 버그 발견!",
    effect: {
      coding: { percentage: -10, bugs: 5 }, // 버그 5개 추가
      energyDrain: 5
    }
  },
  {
    id: 'market_boom',
    type: 'positive',
    message: "시장이 활성화됩니다! 마케팅 진행도 추가 상승!",
    effect: {
      marketing: { percentage: 10 }
    }
  },
  {
    id: 'team_burnout',
    type: 'negative',
    message: "팀원들이 번아웃되었습니다! 에너지 대폭 감소!",
    effect: {
      energyDrain: 20
    }
  },
];

// 랜덤 이벤트 트리거 함수
const triggerRandomEvent = () => {
  const eventChance = Math.random();
  let feedbackMessage: string | null = null;
  let effect: any = {};

  if (eventChance < 0.15) { // 15% 확률로 이벤트 발생
    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    feedbackMessage = event.message;
    effect = event.effect;
  }
  
  if (feedbackMessage) {
    return { feedbackMessage, effect };
  }
  return null;
};


export default function GameSimulationPage() {
  const router = useRouter();
  // userId 상태를 null로 초기화하고, Firebase Auth를 통해 설정
  const [userId, setUserId] = useState<string | null>(null); 
  const [userData, setUserData] = useState<UserGameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationFeedback, setSimulationFeedback] = useState<string | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<FocusArea>('coding');
  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false);

  // Firebase Auth 상태 변경 리스너
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        // userId가 설정되면 fetchUserData가 자동으로 호출될 것
      } else {
        // 사용자가 로그인되지 않은 경우
        setUserId(null);
        setUserData(null); // 사용자 데이터 초기화
        setLoading(false); // 로딩 상태 해제
        setError("로그인이 필요합니다."); // 에러 메시지 설정
        router.replace('/login'); // 로그인 페이지로 리다이렉트
      }
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [router]); // router는 useCallback의 의존성이므로 여기에 추가

  // Firebase에서 사용자 데이터 로드
  const fetchUserData = useCallback(async () => {
    // userId가 아직 설정되지 않았거나 null이면 데이터 로드를 시도하지 않음
    if (!userId) {
      setLoading(false); // userId가 없으므로 로딩 해제
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserGameProgress;
        
        let needsUpdateToFirebase = false; // Firebase 업데이트 필요 여부 플래그

        // gameDevProgress 초기화 로직 (필드가 없거나 누락된 경우)
        if (!data.gameDevProgress) {
          data.gameDevProgress = {
            currentWeek: 0,
            coding: { percentage: 0, bugs: 0 },
            art: { percentage: 0 },
            design: { percentage: 0 },
            marketing: { percentage: 0 },
            quality: 0,
            isReleased: false,
            releaseRevenue: 0,
          };
          needsUpdateToFirebase = true;
        } else {
          // 기존 필드 체크 및 기본값 설정 (누락된 필드 추가)
          if (data.gameDevProgress.coding.bugs === undefined) {
            data.gameDevProgress.coding.bugs = 0;
            needsUpdateToFirebase = true;
          }
          if (data.gameDevProgress.isReleased === undefined) {
            data.gameDevProgress.isReleased = false;
            needsUpdateToFirebase = true;
          }
          if (data.gameDevProgress.releaseRevenue === undefined) {
            data.gameDevProgress.releaseRevenue = 0;
            needsUpdateToFirebase = true;
          }
        }

        // 팀원 에너지 초기화 로직 수정: currentEnergy가 undefined인 경우에만 100으로 초기화
        data.team = data.team.map(member => {
          if (member.currentEnergy === undefined) {
            needsUpdateToFirebase = true;
            return {
              ...member,
              currentEnergy: 100,
            };
          }
          // 에너지가 0 이하인 경우는 그대로 둠 (유지비나 활동으로 소모된 상태)
          return member;
        });

        setUserData(data);

        // 변경 사항이 있다면 Firebase에 업데이트 (최초 로드 시 또는 필드 누락 시)
        if (needsUpdateToFirebase) {
          await updateDoc(userDocRef, {
            gameDevProgress: data.gameDevProgress,
            team: data.team,
            updatedAt: serverTimestamp(),
          });
        }

        // 이미 출시된 게임이면 출시 결과 페이지로 이동
        if (data.gameDevProgress?.isReleased) {
          router.replace('/game-release');
          return;
        }
        // 게임 오버 상태라면 게임 오버 페이지로 이동
        if (data.resources.money <= 0 && data.gameDevProgress.currentWeek > 0) {
            router.replace('/game-over');
            return;
        }

      } else {
        // 사용자 데이터를 찾을 수 없는 경우 (새로운 사용자 또는 데이터 손실)
        setError("사용자 데이터를 찾을 수 없습니다. 새로운 게임을 시작합니다.");
        router.push('/character-creation'); // 캐릭터 생성 페이지로 리다이렉트
      }
    } catch (err) {
      console.error("사용자 데이터 로드 실패:", err);
      setError("데이터를 불러오는 데 실패했습니다.");
      router.push('/character-creation'); // 오류 발생 시에도 캐릭터 생성 페이지로 리다이렉트
    } finally {
      setLoading(false);
    }
  }, [userId, router]); // userId가 변경될 때마다 fetchUserData가 재정의되도록 의존성 추가

  useEffect(() => {
    // userId가 유효할 때만 fetchUserData 호출
    if (userId) {
      fetchUserData();
    }
  }, [fetchUserData, userId]); // fetchUserData와 userId가 변경될 때마다 이 useEffect 실행


  // 게임 출시 처리 함수 (중간 출시 및 자동 출시 모두 사용)
  const handleReleaseGame = async () => {
    if (!userId || !userData || loading) {
      setSimulationFeedback("데이터 로드 중이거나 이미 진행 중입니다. 잠시 후 다시 시도해주세요.");
      setTimeout(() => setSimulationFeedback(null), 2000);
      return;
    }

    setLoading(true);
    setShowReleaseConfirmModal(false); // 모달 닫기

    try {
      const userDocRef = doc(db, 'users', userId);
      let updatedUserData = { ...userData };

      const finalQuality = updatedUserData.gameDevProgress.quality;
      const initialMoney = 10000; 
      // 총 지출된 돈을 계산. 초기 자금에서 현재 남은 돈을 뺀 값으로 간주
      const moneySpentOnUpkeep = initialMoney - updatedUserData.resources.money; 
      
      const baseRevenue = updatedUserData.genre.marketDataSnapshot.estimatedRevenue || 100000;
      const qualityMultiplier = finalQuality / 100;
      // 버그가 많을수록 수익 감소 (최대 100% 감소)
      const bugPenaltyMultiplier = (100 - Math.min(100, updatedUserData.gameDevProgress.coding.bugs * 5)) / 100;
      const genreUserBaseMultiplier = (updatedUserData.genre.marketDataSnapshot.userBase || 100000) / 100000;

      let estimatedRevenue = baseRevenue * qualityMultiplier * bugPenaltyMultiplier * genreUserBaseMultiplier;
      // 총 수익에서 개발에 지출된 돈을 제외한 순수익
      estimatedRevenue = Math.max(0, estimatedRevenue - moneySpentOnUpkeep);

      updatedUserData.gameDevProgress.isReleased = true;
      updatedUserData.gameDevProgress.releaseRevenue = Math.floor(estimatedRevenue); // 수익 저장

      await updateDoc(userDocRef, {
        gameDevProgress: updatedUserData.gameDevProgress,
        resources: {
            ...updatedUserData.resources,
            money: updatedUserData.resources.money + Math.floor(estimatedRevenue) // 수익만큼 돈 추가
        },
        overallProgress: updatedUserData.overallProgress, // 최종 진행도도 저장
        updatedAt: serverTimestamp(),
      });

      setUserData(updatedUserData);
      setSimulationFeedback("게임이 성공적으로 출시되었습니다!");
      setTimeout(() => router.push('/game-release'), 2000); // 출시 페이지로 이동

    } catch (err) {
      console.error("게임 출시 실패:", err);
      setSimulationFeedback("게임 출시에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };


  // '다음 주 진행' 버튼 클릭 핸들러
  const handleAdvanceWeek = async () => {
    if (!userId || !userData || loading) {
      setSimulationFeedback("데이터 로드 중이거나 이미 진행 중입니다. 잠시 후 다시 시도해주세요.");
      setTimeout(() => setSimulationFeedback(null), 2000);
      return;
    }

    setLoading(true);
    let updatedUserData = { ...userData };

    // 1. 주차 증가
    updatedUserData.gameDevProgress.currentWeek += 1;
    let currentWeekFeedback = `${updatedUserData.gameDevProgress.currentWeek}주차 개발 시작!`;
    setSimulationFeedback(currentWeekFeedback);

    // 2. 자원 소모 (매주 팀원 유지비)
    const weeklyUpkeepCost = updatedUserData.team.reduce((sum, member) => sum + Math.max(50, member.skill * 3), 0);
    updatedUserData.resources.money = Math.max(0, updatedUserData.resources.money - weeklyUpkeepCost);

    // 게임 오버 조건 확인 (자금 소진)
    if (updatedUserData.resources.money <= 0 && weeklyUpkeepCost > 0 && updatedUserData.gameDevProgress.currentWeek > 0) {
      setSimulationFeedback("자금이 모두 소진되었습니다! 더 이상 개발을 진행할 수 없습니다. 게임 오버!");
      await updateDoc(doc(db, 'users', userId), {
        resources: updatedUserData.resources,
        updatedAt: serverTimestamp(),
      });
      setTimeout(() => router.replace('/game-over'), 2000);
      setLoading(false);
      return;
    }

    // 3. 팀원 에너지 소모 및 업데이트. effectiveSkill은 따로 계산하여 저장
    const effectiveSkillsMap = new Map<string, number>();

    updatedUserData.team = updatedUserData.team.map(member => {
      let energyChange = -Math.floor(Math.random() * 5 + 5); // 주당 5~9 에너지 소모

      if (selectedFocus === 'rest') {
        energyChange = 15; // 휴식 시 에너지 15 회복
      }
      
      const newEnergy = Math.min(100, Math.max(0, (member.currentEnergy || 0) + energyChange)); // 0보다 작아지지 않도록
      const effectiveSkill = member.skill * (newEnergy / 100);

      effectiveSkillsMap.set(member.id, effectiveSkill);

      return {
        ...member,
        currentEnergy: newEnergy,
      };
    });

    // 4. 개발 진행도 계산 및 버그 발생/수정
    const codingSkill = updatedUserData.team.filter(m => m.role === 'programmer').reduce((sum, m) => sum + (effectiveSkillsMap.get(m.id) || 0), 0);
    const artSkill = updatedUserData.team.filter(m => m.role === 'artist').reduce((sum, m) => sum + (effectiveSkillsMap.get(m.id) || 0), 0);
    const designSkill = updatedUserData.team.filter(m => m.role === 'designer').reduce((sum, m) => sum + (effectiveSkillsMap.get(m.id) || 0), 0);
    const marketingSkill = updatedUserData.team.filter(m => m.role === 'marketing').reduce((sum, m) => sum + (effectiveSkillsMap.get(m.id) || 0), 0);

    const baseProgressIncreaseFactor = 0.4;

    let codingInc = codingSkill * baseProgressIncreaseFactor;
    let artInc = artSkill * baseProgressIncreaseFactor;
    let designInc = designSkill * baseProgressIncreaseFactor;
    let marketingInc = marketingSkill * baseProgressIncreaseFactor * 0.5;

    // 버그 발생/수정 로직 강화 및 피드백
    let bugsGeneratedThisWeek = Math.floor(Math.random() * 2); // 기본 0-1 버그 발생
    let bugsFixedThisWeek = 0;

    if (selectedFocus === 'coding') {
      codingInc *= 1.8;
      bugsGeneratedThisWeek += Math.floor(Math.random() * (codingSkill / 20) + 1); // 코딩 집중 시 1 + (0-X) 버그 추가
    } else if (selectedFocus === 'bugFixing') {
      bugsFixedThisWeek = Math.floor(Math.random() * (codingSkill / 8) + 3); // 버그 수정 집중 시 3 + (0-X) 버그 수정
      codingInc *= 0.2;
      artInc *= 0.2;
      designInc *= 0.2;
      marketingInc *= 0.2;
    } else if (selectedFocus === 'rest') {
      codingInc = 0; artInc = 0; designInc = 0; marketingInc = 0;
    }

    // 랜덤 이벤트 적용
    const eventResult = triggerRandomEvent();
    if (eventResult) {
        setSimulationFeedback(prev => (prev ? prev + "\n" + eventResult.feedbackMessage : eventResult.feedbackMessage));
        const eventEffect = eventResult.effect;
        if (eventEffect.coding?.percentage) codingInc += eventEffect.coding.percentage;
        if (eventEffect.art?.percentage) artInc += eventEffect.art.percentage;
        if (eventEffect.design?.percentage) designInc += eventEffect.design.percentage;
        if (eventEffect.marketing?.percentage) marketingInc += eventEffect.marketing.percentage;
        
        if (eventEffect.bugs) bugsGeneratedThisWeek += eventEffect.bugs; // 이벤트로 인한 버그 추가
        if (eventEffect.energyBoost) {
          updatedUserData.team = updatedUserData.team.map(member => ({
            ...member,
            currentEnergy: Math.min(100, (member.currentEnergy || 0) + eventEffect.energyBoost),
          }));
        }
        if (eventEffect.energyDrain) {
          updatedUserData.team = updatedUserData.team.map(member => ({
            ...member,
            currentEnergy: Math.max(0, (member.currentEnergy || 0) - eventEffect.energyDrain),
          }));
        }
    }

    updatedUserData.gameDevProgress.coding.percentage = Math.min(100, updatedUserData.gameDevProgress.coding.percentage + codingInc);
    updatedUserData.gameDevProgress.art.percentage = Math.min(100, updatedUserData.gameDevProgress.art.percentage + artInc);
    updatedUserData.gameDevProgress.design.percentage = Math.min(100, updatedUserData.gameDevProgress.design.percentage + designInc);
    updatedUserData.gameDevProgress.marketing.percentage = Math.min(100, updatedUserData.gameDevProgress.marketing.percentage + marketingInc);
    
    // 버그 업데이트 전에 현재 버그 수 저장
    const bugsBeforeUpdate = updatedUserData.gameDevProgress.coding.bugs;
    updatedUserData.gameDevProgress.coding.bugs = Math.max(0, updatedUserData.gameDevProgress.coding.bugs + bugsGeneratedThisWeek - bugsFixedThisWeek);
    const bugsAfterUpdate = updatedUserData.gameDevProgress.coding.bugs;

    // 버그 관련 피드백 추가
    let bugSpecificFeedback = '';
    if (bugsGeneratedThisWeek > 0) {
      bugSpecificFeedback += ` ${bugsGeneratedThisWeek}개의 버그가 발생했습니다.`;
    }
    if (bugsFixedThisWeek > 0) {
      bugSpecificFeedback += ` ${bugsFixedThisWeek}개의 버그를 수정했습니다.`;
    }
    if (bugsGeneratedThisWeek > 0 || bugsFixedThisWeek > 0) {
      bugSpecificFeedback += ` 현재 버그 수: ${bugsAfterUpdate}개.`;
    }
    setSimulationFeedback(prev => (prev ? prev + "\n" + bugSpecificFeedback : bugSpecificFeedback));


    // 5. 전체 진행도 및 품질 업데이트
    const totalDevelopmentProgressPercentage = 
      (updatedUserData.gameDevProgress.coding.percentage + 
       updatedUserData.gameDevProgress.art.percentage + 
       updatedUserData.gameDevProgress.design.percentage + 
       updatedUserData.gameDevProgress.marketing.percentage) / 4;
    
    updatedUserData.overallProgress = Math.min(100, 60 + totalDevelopmentProgressPercentage * 0.4);

    const bugPenalty = Math.min(50, updatedUserData.gameDevProgress.coding.bugs * 2);
    const avgSkill = updatedUserData.team.reduce((sum, m) => sum + m.skill, 0) / (updatedUserData.team.length || 1);
    
    updatedUserData.gameDevProgress.quality = Math.max(0, 
      (totalDevelopmentProgressPercentage * 0.7) +
      (avgSkill * 0.3) -
      bugPenalty
    );
    updatedUserData.gameDevProgress.quality = Math.min(100, updatedUserData.gameDevProgress.quality);


    // 6. Firebase 업데이트
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        resources: updatedUserData.resources,
        gameDevProgress: updatedUserData.gameDevProgress,
        team: updatedUserData.team,
        overallProgress: updatedUserData.overallProgress,
        updatedAt: serverTimestamp(),
      });
      setUserData(updatedUserData);
    } catch (err) {
      console.error("주차 진행 업데이트 실패:", err);
      setSimulationFeedback("주차 진행에 실패했습니다.");
    } finally {
      setLoading(false);
    }

    // 게임 완료 조건 확인 (100% 달성 시 자동 출시)
    const isReadyForFullRelease = 
      updatedUserData.gameDevProgress.coding.percentage >= 100 &&
      updatedUserData.gameDevProgress.art.percentage >= 100 &&
      updatedUserData.gameDevProgress.design.percentage >= 100 &&
      updatedUserData.gameDevProgress.marketing.percentage >= 100 &&
      updatedUserData.gameDevProgress.coding.bugs <= 0;
        
    if (isReadyForFullRelease && !updatedUserData.gameDevProgress.isReleased) {
      setSimulationFeedback("모든 개발이 완료되었고 버그가 없습니다! 게임을 출시합니다.");
      handleReleaseGame();
    }
  };

  // 현재 팀원의 총 능력치 계산 (UI 표시용)
  const calculateTotalSkill = (role: TeamMember['role']) => {
    return userData?.team.filter(m => m.role === role).reduce((sum, m) => sum + m.skill, 0) || 0;
  };

  const currentWeek = userData?.gameDevProgress?.currentWeek || 0;
  const codingProgress = userData?.gameDevProgress?.coding.percentage || 0;
  const artProgress = userData?.gameDevProgress?.art.percentage || 0;
  const designProgress = userData?.gameDevProgress?.design.percentage || 0;
  const marketingProgress = userData?.gameDevProgress?.marketing.percentage || 0;
  const currentBugs = userData?.gameDevProgress?.coding.bugs || 0;
  const gameQuality = userData?.gameDevProgress?.quality || 0;
  const currentMoney = userData?.resources?.money || 0;

  if (loading && !userData) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        데이터 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500 text-xl">
        오류: {error}
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col">
      <h1 className="text-4xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-600">
        게임 개발 시뮬레이션
      </h1>

      {simulationFeedback && (
        <div className={`mb-4 p-3 rounded-md text-center font-semibold ${simulationFeedback.includes('실패') || simulationFeedback.includes('오버') || simulationFeedback.includes('버그') ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'} whitespace-pre-line`}>
          {simulationFeedback}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        {/* 자원 및 진행도 카드 */}
        <Card className="md:col-span-1 p-6 shadow-lg dark:bg-gray-800">
          <Card.Header>
            <h2 className="text-2xl font-bold mb-4 dark:text-white">현재 상태</h2>
          </Card.Header>
          <Card.Body className="space-y-3">
            <p className="text-lg dark:text-gray-300">
              <span className="font-semibold">주차:</span> {userData.gameDevProgress.currentWeek}
            </p>
            <p className="text-lg dark:text-gray-300">
              <span className="font-semibold">자금:</span> ${currentMoney.toLocaleString()}
            </p>
            <p className="text-lg dark:text-gray-300">
              <span className="font-semibold">전체 진행도:</span> {userData.overallProgress.toFixed(1)}%
              <ProgressBar progress={userData.overallProgress} />
            </p>
            <p className="text-lg dark:text-gray-300">
              <span className="font-semibold">게임 품질:</span> {gameQuality.toFixed(1)}점
              <ProgressBar 
                progress={gameQuality} 
                barColorClass={gameQuality >= 70 ? "bg-green-500" : gameQuality >= 40 ? "bg-yellow-500" : "bg-red-500"} 
              />
            </p>
            <p className="text-lg dark:text-gray-300">
              <span className="font-semibold">현재 버그:</span> {currentBugs}개
            </p>
            <p className="text-lg dark:text-gray-300">
              <span className="font-semibold">선택 장르:</span> {userData.genre.selected}
            </p>
          </Card.Body>
        </Card>

        {/* 개발 진행도 카드 */}
        <Card className="md:col-span-2 p-6 shadow-lg dark:bg-gray-800">
          <Card.Header>
            <h2 className="text-2xl font-semibold dark:text-white">개발 진행도 (세부)</h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div>
              <p className="text-lg font-semibold dark:text-gray-300">코딩: {codingProgress.toFixed(1)}%</p>
              <ProgressBar progress={codingProgress} barColorClass="bg-blue-500" />
            </div>
            <div>
              <p className="text-lg font-semibold dark:text-gray-300">아트: {artProgress.toFixed(1)}%</p>
              <ProgressBar progress={artProgress} barColorClass="bg-purple-500" />
            </div>
            <div>
              <p className="text-lg font-semibold dark:text-gray-300">디자인: {designProgress.toFixed(1)}%</p>
              <ProgressBar progress={designProgress} barColorClass="bg-green-500" />
            </div>
            <div>
              <p className="text-lg font-semibold dark:text-gray-300">마케팅: {marketingProgress.toFixed(1)}%</p>
              <ProgressBar progress={marketingProgress} barColorClass="bg-red-500" />
            </div>
            <div className="mt-6 text-xl font-bold dark:text-white">
              <p>현재 버그 수: <span className="text-red-500">{currentBugs}개</span></p>
              <p>현재 게임 품질: <span className="text-yellow-400">{gameQuality.toFixed(1)}</span></p>
            </div>
          </Card.Body>
        </Card>

        {/* 팀원 현황 카드 */}
        <Card className="md:col-span-3 p-6 shadow-lg dark:bg-gray-800">
          <Card.Header>
            <h2 className="text-2xl font-semibold dark:text-white">나의 개발팀</h2>
          </Card.Header>
          <Card.Body>
            {userData.team.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">고용된 팀원이 없습니다. 팀 빌딩 단계에서 팀원을 고용하세요!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userData.team.map(member => (
                  <div key={member.id} className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg shadow dark:bg-gray-700">
                    <img src={member.imageSrc} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h3 className="font-semibold dark:text-white">{member.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {member.role} (능력치: {member.skill} / 에너지: {member.currentEnergy?.toFixed(0) || 100})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-gray-700 dark:text-gray-200">
              <p>총 코딩 능력: {calculateTotalSkill('programmer')}</p>
              <p>총 아트 능력: {calculateTotalSkill('artist')}</p>
              <p>총 디자인 능력: {calculateTotalSkill('designer')}</p>
              <p>총 마케팅 능력: {calculateTotalSkill('marketing')}</p>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* 액션 버튼 */}
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        <select
          value={selectedFocus}
          onChange={(e) => setSelectedFocus(e.target.value as FocusArea)}
          className="p-3 border rounded-md bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 mb-4 sm:mb-0"
        >
          <option value="coding">코딩 집중</option>
          <option value="art">아트 집중</option>
          <option value="design">디자인 집중</option>
          <option value="marketing">마케팅 집중</option>
          <option value="bugFixing">버그 수정</option>
          <option value="rest">휴식</option>
        </select>
        <Button onClick={handleAdvanceWeek} disabled={loading} className="px-6 py-3 text-lg">
          {loading ? '진행 중...' : '다음 주차 진행'}
        </Button>
        <Button 
            onClick={() => setShowReleaseConfirmModal(true)} 
            disabled={loading} 
            className="px-6 py-3 text-lg bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
        >
            게임 출시!
        </Button>
      </div>

      {/* 출시 확인 모달 */}
      <Modal
        isOpen={showReleaseConfirmModal}
        onClose={() => setShowReleaseConfirmModal(false)}
        title="게임 출시 확인"
      >
        <Modal.Body className="dark:text-gray-300">
          <p className="text-lg mb-4">
            현재 진행도로 게임을 출시하시겠습니까? <br/>
            출시 후에는 개발을 계속할 수 없습니다.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            onClick={() => setShowReleaseConfirmModal(false)} 
            variant="ghost"
          >
            취소
          </Button>
          <Button 
            onClick={handleReleaseGame} 
            className="bg-purple-600 hover:bg-purple-700"
            disabled={loading}
          >
            {loading ? '출시 중...' : '지금 출시'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 추가 기능들을 위한 Placeholder */}
      <div className="mt-12 p-6 bg-gray-100 rounded-lg shadow-inner dark:bg-gray-900 dark:text-gray-300">
        <h3 className="text-xl font-semibold mb-4 dark:text-white">향후 추가될 기능:</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>팀원 관리 상세 (개별 팀원 사기 관리, 교육, 해고)</li>
          <li>게임 기능 트리 또는 연구 개발</li>
          <li>시장 동향 분석 및 장르 변경 고려</li>
          <li>투자 유치 및 자금 조달 이벤트</li>
          <li>출시 전 테스트 (QA) 및 피드백 반영</li>
          <li>UI/UX 개선 및 시각화</li>
        </ul>
      </div>
    </div>
  );
}
