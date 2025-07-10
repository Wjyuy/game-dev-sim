// app/project-start/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/clientConfig'; // auth 임포트 추가
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth'; // Firebase User 타입 임포트

// UI 컴포넌트 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';

// 데이터 타입 및 관련 데이터 임포트
import { TeamMember, allTeamMembers } from '@/types/team';
import { mapBackgrounds, designObjects } from '@/utils/map_assets';
import { UserGameProgress } from '@/types/game'; 

export default function ProjectStartPage() {
  const router = useRouter();
  // TODO: 실제 userId (Firebase Auth 연동) - 이제 Firebase Auth에서 가져옵니다.
  const [userId, setUserId] = useState<string | null>(null); // userId 상태 추가

  const [userData, setUserData] = useState<UserGameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase Auth 상태 변경 리스너
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        setLoading(false); // 로딩 완료
        // 로그인되면 바로 사용자 데이터 로드 시도
        // fetchUserData는 userId가 설정된 후에 호출되도록 의존성 배열에 userId를 추가
      } else {
        setUserId(null);
        setUserData(null); // 사용자 데이터 초기화
        setLoading(false); // 로딩 상태 해제
        setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
        router.replace('/login'); // 로그인 페이지로 리다이렉트
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Firebase에서 현재 사용자 데이터 로드
  const fetchUserData = useCallback(async () => {
    if (!userId) {
      // userId가 아직 설정되지 않았다면 (예: onAuthStateChanged가 완료되지 않음) 바로 리턴
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

        // ⭐ 핵심: 현재 단계(currentStep) 확인 및 리다이렉션 로직 강화 ⭐
        // 이 페이지는 `currentStep: 5` (팀 빌딩 완료) 후에 도달해야 합니다.
        // 만약 currentStep이 5보다 작다면, 이전 단계로 리다이렉트합니다.
        if (data.currentStep === undefined || data.currentStep < 5) { // 5는 팀 빌딩 완료 후 단계
          setError("아직 프로젝트 시작 단계가 아닙니다. 이전 단계로 이동합니다.");
          // 각 단계별로 적절한 페이지로 리다이렉트하도록 로직 추가
          if (data.currentStep === 0) router.replace('/character-creation');
          else if (data.currentStep === 1) router.replace('/genre-selection');
          else if (data.currentStep === 2) router.replace('/coding-challenge');
          else if (data.currentStep === 3) router.replace('/design-studio');
          else if (data.currentStep === 4) router.replace('/team-building');
          else router.replace('/character-creation'); // 알 수 없는 단계면 처음으로
          return; // 리다이렉트 후 함수 종료
        } else if (data.currentStep >= 6) { // 이미 게임 시뮬레이션 이상 진행된 경우
          setError("이미 게임 개발이 진행 중입니다. 시뮬레이션 페이지로 이동합니다.");
          router.replace('/game-simulation');
          return;
        }

      } else {
        setError("사용자 데이터를 찾을 수 없습니다. 새로운 게임을 시작합니다.");
        router.push('/character-creation'); // 데이터가 없으면 첫 단계로 이동
      }
    } catch (err: any) { // err 타입 지정
      console.error("사용자 데이터 로드 실패:", err);
      setError("데이터를 불러오는 데 실패했습니다: " + err.message);
      router.push('/character-creation'); // 에러 발생 시 첫 단계로 이동
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  // userId가 변경될 때마다 fetchUserData 호출
  useEffect(() => {
    if (userId) { // userId가 유효할 때만 데이터를 가져오도록
      fetchUserData();
    }
  }, [userId, fetchUserData]);

  // 게임 개발 시작 버튼 클릭 핸들러
  const handleStartGameDevelopment = async () => {
    if (!userId || !userData) {
      alert("데이터 로드 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setLoading(true); // 버튼 클릭 시 로딩 시작
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 6, // 다음 단계 (게임 개발 시뮬레이션)
        overallProgress: Math.min(100, (userData.overallProgress || 0) + 5), // 추가 진행도
        updatedAt: serverTimestamp(),
      });
      alert('본격적인 게임 개발을 시작합니다!');
      router.push('/game-simulation'); // 실제 게임 개발 시뮬레이션 페이지 경로
    } catch (err: any) { // err 타입 지정
      console.error("게임 개발 시작 실패:", err);
      alert("게임 개발을 시작하는 데 실패했습니다. 다시 시도해주세요.");
      setError("게임 개발 시작 실패: " + err.message);
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 로딩 및 에러 상태 UI
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        데이터를 준비 중입니다...
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
        {error.includes("사용자 데이터를 찾을 수 없습니다") && (
          <Button onClick={() => router.push('/character-creation')} className="mt-4">
            새 게임 시작
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

  if (!userData) { // userData가 최종적으로 없으면 (fetch 실패 등)
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        표시할 데이터가 없습니다.
        <Button onClick={() => router.push('/character-creation')} className="mt-4">새 게임 시작</Button>
      </div>
    );
  }

  // 데이터 요약을 위한 보조 데이터 변수들
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
        총점: {userData.totalScore || 0} | 현재 보유 금액: ${userData.resources?.money?.toLocaleString() || 0}
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
        <Button onClick={handleStartGameDevelopment} disabled={loading}>
          {loading ? '준비 중...' : '게임 개발 시작하기!'}
        </Button>
      </div>
    </div>
  );
}