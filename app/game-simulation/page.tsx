// app/game-simulation/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/clientConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// UI 컴포넌트 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';

// 데이터 타입 임포트 (전체 UserGameProgress 인터페이스를 가져오는 것이 좋습니다)
import { allTeamMembers, TeamMember } from '@/types/team';
// 🔥 UserGameProgress는 types/game.ts에서 가져옵니다.
// 현재 UserGameProgress를 페이지 내에 UserGameProgressData로 임시 정의했지만,
// 실제 프로젝트에서는 중앙 인터페이스 파일에서 가져와야 합니다.

import { UserGameProgress } from '@/types/UserGameProgress'; 

export default function GameSimulationPage() {
  const router = useRouter();
  const userId = "test_user_id"; // TODO: 실제 userId (Firebase Auth 연동)

  const [userData, setUserData] = useState<UserGameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationFeedback, setSimulationFeedback] = useState<string | null>(null);

  // Firebase에서 사용자 데이터 로드
  const fetchUserData = useCallback(async () => {
    if (!userId) {
      setError("로그인 정보가 없습니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserGameProgress;
        // gameDevProgress 초기화 로직 (없다면 기본값 설정)
        if (!data.gameDevProgress) {
          data.gameDevProgress = {
            currentWeek: 0,
            coding: { percentage: 0, bugs: 0 },
            art: { percentage: 0 },
            design: { percentage: 0 },
            marketing: { percentage: 0 },
            quality: 0,
            isReleased: false,
          };
          // 이 때 Firebase에도 업데이트해주는 것이 좋습니다.
          await updateDoc(userDocRef, {
            gameDevProgress: data.gameDevProgress,
            updatedAt: serverTimestamp(),
          });
        }
        setUserData(data);
      } else {
        setError("사용자 데이터를 찾을 수 없습니다. 처음부터 다시 시작해주세요.");
        // router.push('/character-creation');
      }
    } catch (err) {
      console.error("사용자 데이터 로드 실패:", err);
      setError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // '다음 주 진행' 버튼 클릭 핸들러
  const handleAdvanceWeek = async () => {
    if (!userId || !userData) {
      setSimulationFeedback("데이터 로드 중입니다. 잠시 후 다시 시도해주세요.");
      setTimeout(() => setSimulationFeedback(null), 2000);
      return;
    }

    setLoading(true);
    const updatedUserData = { ...userData };

    // 1. 주차 증가
    updatedUserData.gameDevProgress.currentWeek += 1;
    setSimulationFeedback(`${updatedUserData.gameDevProgress.currentWeek}주차 개발 시작!`);

    // 2. 자원 소모 (매주 팀원 유지비)
    const weeklyUpkeepCost = updatedUserData.team.reduce((sum, member) => sum + Math.max(100, member.skill * 5), 0); // 임의의 계산
    updatedUserData.resources.money = Math.max(0, updatedUserData.resources.money - weeklyUpkeepCost);

    if (updatedUserData.resources.money === 0 && weeklyUpkeepCost > 0) {
      setSimulationFeedback("자금이 모두 소진되었습니다! 더 이상 개발을 진행할 수 없습니다.");
      // TODO: 게임 오버 또는 다른 처리
      setLoading(false);
      return;
    }

    // 3. 개발 진행도 계산 (각 팀원의 역할과 능력치에 따라)
    const codingSkill = updatedUserData.team.filter(m => m.role === 'programmer').reduce((sum, m) => sum + m.skill, 0);
    const artSkill = updatedUserData.team.filter(m => m.role === 'artist').reduce((sum, m) => sum + m.skill, 0);
    const designSkill = updatedUserData.team.filter(m => m.role === 'designer').reduce((sum, m) => sum + m.skill, 0);
    const marketingSkill = updatedUserData.team.filter(m => m.role === 'marketing').reduce((sum, m) => sum + m.skill, 0);
    const leaderSkill = updatedUserData.team.filter(m => m.role === 'leader').reduce((sum, m) => sum + m.skill, 0);

    const progressIncreaseFactor = 0.5; // 주차당 진행도 증가율 조정

    updatedUserData.gameDevProgress.coding.percentage = Math.min(100, updatedUserData.gameDevProgress.coding.percentage + codingSkill * progressIncreaseFactor);
    updatedUserData.gameDevProgress.art.percentage = Math.min(100, updatedUserData.gameDevProgress.art.percentage + artSkill * progressIncreaseFactor);
    updatedUserData.gameDevProgress.design.percentage = Math.min(100, updatedUserData.gameDevProgress.design.percentage + designSkill * progressIncreaseFactor);
    updatedUserData.gameDevProgress.marketing.percentage = Math.min(100, updatedUserData.gameDevProgress.marketing.percentage + marketingSkill * progressIncreaseFactor * 0.5); // 마케팅은 초반엔 좀 느리게

    // 4. 전체 진행도 및 품질 업데이트
    const totalDevelopmentProgress = 
      (updatedUserData.gameDevProgress.coding.percentage + 
       updatedUserData.gameDevProgress.art.percentage + 
       updatedUserData.gameDevProgress.design.percentage + 
       updatedUserData.gameDevProgress.marketing.percentage) / 4;
    
    updatedUserData.overallProgress = Math.min(100, 60 + totalDevelopmentProgress * 0.4); // 60%부터 시작 + 개발 진행도 40% 반영

    // 게임 품질은 팀원의 총합 능력치, 버그 수, 장르 매칭 등으로 복잡하게 계산될 수 있습니다.
    // 여기서는 간단하게 모든 스킬 합산에 따라 증가
    updatedUserData.gameDevProgress.quality = Math.min(100, (codingSkill + artSkill + designSkill + marketingSkill + leaderSkill) / (updatedUserData.team.length > 0 ? updatedUserData.team.length : 1) * 1.5); // 평균 스킬에 비례

    // 5. Firebase 업데이트
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        resources: updatedUserData.resources,
        gameDevProgress: updatedUserData.gameDevProgress,
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

    // 6. 게임 출시 조건 확인
    if (updatedUserData.gameDevProgress.coding.percentage >= 100 &&
        updatedUserData.gameDevProgress.art.percentage >= 100 &&
        updatedUserData.gameDevProgress.design.percentage >= 100 &&
        updatedUserData.gameDevProgress.marketing.percentage >= 100 &&
        !updatedUserData.gameDevProgress.isReleased) {
          
      setSimulationFeedback("모든 개발이 완료되었습니다! 게임을 출시합니다.");
      updatedUserData.gameDevProgress.isReleased = true; // 출시 상태로 변경

      try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          'gameDevProgress.isReleased': true,
          // 'gameDevProgress.releaseRevenue': calculateRevenue(updatedUserData), // 수익 계산 로직 추가 필요
          currentStep: 7, // 다음 단계: 게임 출시 결과
          overallProgress: 100,
          updatedAt: serverTimestamp(),
        });
        setTimeout(() => router.push('/game-release'), 2000); // 게임 출시 결과 페이지로 이동
      } catch (err) {
        console.error("게임 출시 상태 업데이트 실패:", err);
        setSimulationFeedback("게임 출시 처리 중 오류 발생.");
      }
    }
  };

  // 현재 팀원의 총 능력치 계산
  const totalCodingSkill = userData?.team.filter(m => m.role === 'programmer').reduce((sum, m) => sum + m.skill, 0) || 0;
  const totalArtSkill = userData?.team.filter(m => m.role === 'artist').reduce((sum, m) => sum + m.skill, 0) || 0;
  const totalDesignSkill = userData?.team.filter(m => m.role === 'designer').reduce((sum, m) => sum + m.skill, 0) || 0;
  const totalMarketingSkill = userData?.team.filter(m => m.role === 'marketing').reduce((sum, m) => sum + m.skill, 0) || 0;

  if (loading && !userData) { // 초기 로딩 시에만 전체 화면 로딩 표시
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        데이터 로드 중...
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

  // 게임 출시 후에는 다른 페이지로 리다이렉트
  if (userData.gameDevProgress?.isReleased) {
    router.replace('/game-release'); // 게임 출시 페이지로 강제 이동
    return null; // 리다이렉트 중에는 아무것도 렌더링하지 않음
  }

  const currentWeek = userData.gameDevProgress?.currentWeek || 0;
  const codingProgress = userData.gameDevProgress?.coding.percentage || 0;
  const artProgress = userData.gameDevProgress?.art.percentage || 0;
  const designProgress = userData.gameDevProgress?.design.percentage || 0;
  const marketingProgress = userData.gameDevProgress?.marketing.percentage || 0;
  const gameQuality = userData.gameDevProgress?.quality || 0;
  const currentMoney = userData.resources?.money || 0;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">
        게임 개발 시뮬레이션
      </h1>
      <ProgressBar progress={userData.overallProgress || 0} barColorClass="bg-yellow-500" />
      <p className="text-center text-gray-600 mt-2 dark:text-gray-400">
        현재 주차: <span className="font-bold">{currentWeek}주차</span> | 보유 금액: <span className="font-bold text-green-500">${currentMoney}</span>
      </p>
      {simulationFeedback && (
        <p className={`text-center text-lg font-semibold mt-4 ${simulationFeedback.includes('실패') || simulationFeedback.includes('소진') ? 'text-red-500' : 'text-blue-500'} dark:text-white`}>
          {simulationFeedback}
        </p>
      )}

      {/* 팀원 현황 */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">나의 개발팀</h2>
        </Card.Header>
        <Card.Body>
          {userData.team.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">고용된 팀원이 없습니다. 팀 빌딩 단계에서 팀원을 고용하세요!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userData.team.map(member => (
                <div key={member.id} className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg dark:bg-gray-700">
                  <img src={member.imageSrc} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h3 className="font-semibold dark:text-white">{member.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{member.role} (능력치: {member.skill})</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-gray-700 dark:text-gray-200">
            <p>총 코딩 능력: {totalCodingSkill}</p>
            <p>총 아트 능력: {totalArtSkill}</p>
            <p>총 디자인 능력: {totalDesignSkill}</p>
            <p>총 마케팅 능력: {totalMarketingSkill}</p>
          </div>
        </Card.Body>
      </Card>

      {/* 개발 진행도 */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">개발 진행도</h2>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <div>
              <p className="font-medium dark:text-white">코딩: {codingProgress.toFixed(1)}%</p>
              <ProgressBar progress={codingProgress} barColorClass="bg-blue-500" />
            </div>
            <div>
              <p className="font-medium dark:text-white">아트: {artProgress.toFixed(1)}%</p>
              <ProgressBar progress={artProgress} barColorClass="bg-purple-500" />
            </div>
            <div>
              <p className="font-medium dark:text-white">디자인: {designProgress.toFixed(1)}%</p>
              <ProgressBar progress={designProgress} barColorClass="bg-green-500" />
            </div>
            <div>
              <p className="font-medium dark:text-white">마케팅: {marketingProgress.toFixed(1)}%</p>
              <ProgressBar progress={marketingProgress} barColorClass="bg-red-500" />
            </div>
            <div className="mt-6 text-xl font-bold dark:text-white">
              <p>현재 게임 품질: <span className="text-yellow-400">{gameQuality.toFixed(1)}</span></p>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="text-center mt-8">
        <Button onClick={handleAdvanceWeek} disabled={loading}>
          {loading ? '진행 중...' : '다음 주 진행'}
        </Button>
      </div>

      {/* 추가 기능들을 위한 Placeholder */}
      <div className="mt-12 p-6 bg-gray-100 rounded-lg shadow-inner dark:bg-gray-900 dark:text-gray-300">
        <h3 className="text-xl font-semibold mb-4 dark:text-white">향후 추가될 기능:</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>랜덤 이벤트 (버그 발생, 팀원 사기 저하, 시장 변화 등)</li>
          <li>팀원 관리 (사기 관리, 해고, 교육 등)</li>
          <li>게임 기능 개발 선택 (새로운 시스템 추가, 그래픽 개선 등)</li>
          <li>투자 유치 및 자금 조달</li>
          <li>버그 수정 시스템</li>
          <li>출시 전 테스트 및 피드백 반영</li>
        </ul>
      </div>
    </div>
  );
}