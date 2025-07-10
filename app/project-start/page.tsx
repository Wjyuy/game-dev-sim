// app/project-start/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/clientConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// UI 컴포넌트 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';

// 🔥 데이터 타입 및 관련 데이터 임포트
import { TeamMember, allTeamMembers } from '@/types/team'; // allTeamMembers도 함께 임포트
import { mapBackgrounds, designObjects } from '@/utils/map_assets'; // mapBackgrounds, designObjects도 함께 임포트
import { UserGameProgress } from '@/types/UserGameProgress'; 



export default function ProjectStartPage() {
  const router = useRouter();
  const userId = "test_user_id"; // TODO: 실제 userId (Firebase Auth 연동)

  const [userData, setUserData] = useState<UserGameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase에서 현재 사용자 데이터 로드
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        // userId가 없으면 로그인 페이지로 리다이렉트 또는 에러 처리
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
          setUserData(docSnap.data() as UserGameProgress);
        } else {
          setError("사용자 데이터를 찾을 수 없습니다. 처음부터 다시 시작해주세요.");
          // 필요하다면 캐릭터 생성 페이지로 리다이렉트
          // router.push('/character-creation');
        }
      } catch (err) {
        console.error("사용자 데이터 로드 실패:", err);
        setError("데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId]);

  // 게임 개발 시작 버튼 클릭 핸들러
  const handleStartGameDevelopment = async () => {
    if (!userId || !userData) {
      alert("데이터 로드 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 6, // 다음 단계 (게임 개발 시뮬레이션)
        overallProgress: Math.min(100, (userData.overallProgress || 0) + 5), // 추가 진행도
        updatedAt: serverTimestamp(),
      });
      alert('본격적인 게임 개발을 시작합니다!');
      router.push('/game-simulation'); // 실제 게임 개발 시뮬레이션 페이지 경로
    } catch (err) {
      console.error("게임 개발 시작 실패:", err);
      alert("게임 개발을 시작하는 데 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        데이터를 준비 중입니다...
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
        표시할 데이터가 없습니다.
      </div>
    );
  }

  // 🔥 데이터 요약을 위한 보조 데이터 변수들
  const selectedBgName = userData.designProgress?.selectedBackground
    ? (mapBackgrounds.find(bg => bg.id === userData.designProgress?.selectedBackground)?.name || '알 수 없음')
    : '선택 안됨';
  
  const placedObjectsSummary = userData.designProgress?.placedObjects?.map(obj => 
    (designObjects.find(dObj => dObj.id === obj.id)?.name || obj.id)
  ).join(', ') || '없음';

  const teamSummary = userData.team?.map(member => member.name).join(', ') || '고용된 팀원 없음';

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">
        프로젝트 시작 준비 완료!
      </h1>
      <ProgressBar progress={userData.overallProgress || 0} barColorClass="bg-purple-500" />
      <p className="text-center text-gray-600 mt-2 dark:text-gray-400">
        총점: {userData.totalScore || 0} | 현재 보유 금액: ${userData.resources?.money || 0}
      </p>

      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">게임 요약</h2>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4 text-lg dark:text-gray-300">
            <p><strong>캐릭터 타입:</strong> <span className="capitalize">{userData.character?.type || '선택 안됨'}</span></p>
            <p><strong>선택 장르:</strong> <span className="capitalize">{userData.genre?.selected || '선택 안됨'}</span></p>
            <p><strong>코딩 점수:</strong> {userData.codingProgress?.score || 0}</p>
            <p><strong>디자인 점수:</strong> {userData.designProgress?.score || 0}</p>
            <p><strong>선택 배경:</strong> {selectedBgName}</p>
            <p><strong>배치된 오브젝트:</strong> {placedObjectsSummary}</p>
            <p><strong>고용된 팀원:</strong> {teamSummary}</p>
            <p><strong>최종 총점:</strong> {userData.totalScore || 0}</p>
          </div>
        </Card.Body>
      </Card>

      <div className="text-center mt-8">
        <p className="text-xl mb-4 font-medium dark:text-white">이제 당신의 게임 개발 여정을 시작할 시간입니다!</p>
        <Button onClick={handleStartGameDevelopment}>
          게임 개발 시작하기!
        </Button>
      </div>
    </div>
  );
}