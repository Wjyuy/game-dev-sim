// app/team-building/page.tsx
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

// 데이터 타입 및 데이터 임포트
import { allTeamMembers, TeamMember } from '@/types/team';

export default function TeamBuildingPage() {
  const router = useRouter();
  // ⭐ userId 상태를 null로 초기화 ⭐
  const [userId, setUserId] = useState<string | null>(null);

  // 사용자 게임 진행 상태
  const [userMoney, setUserMoney] = useState(0);
  const [userTotalScore, setUserTotalScore] = useState(0);
  const [userOverallProgress, setUserOverallProgress] = useState(0);
  const [hiredTeam, setHiredTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // 에러 상태 추가

  // ⭐ Firebase Auth 상태 변경 리스너 ⭐
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        setLoading(false); // 로딩 완료
        // 로그인되면 바로 사용자 데이터 로드 시도
        // fetchUserData는 userId가 설정된 후에 호출되도록 의존성 배열에 userId를 추가
      } else {
        setUserId(null);
        setLoading(false); // 로딩 상태 해제
        setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
        router.replace('/login'); // 로그인 페이지로 리다이렉트
      }
    });

    return () => unsubscribe();
  }, [router]);


  // Firebase에서 사용자 데이터 로드
  const fetchUserData = useCallback(async () => {
    if (!userId) {
      // userId가 아직 설정되지 않았다면 (예: onAuthStateChanged가 완료되지 않음) 바로 리턴
      return;
    }
    setLoading(true);
    setError(null); // 에러 상태 초기화
    try {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserMoney(data.resources?.money || 0);
        setUserTotalScore(data.totalScore || 0);
        setUserOverallProgress(data.overallProgress || 0);
        setHiredTeam((data.team || []) as TeamMember[]);

        // ⭐ 핵심: 현재 단계(currentStep) 확인 및 리다이렉션 로직 강화 ⭐
        // 이 페이지는 `currentStep: 4` (디자인 스튜디오 완료) 후에 도달해야 합니다.
        if (data.currentStep === undefined || data.currentStep < 4) {
          setError("아직 팀 빌딩 단계가 아닙니다. 이전 단계로 이동합니다.");
          // 각 단계별로 적절한 페이지로 리다이렉트하도록 로직 추가
          if (data.currentStep === 0) router.replace('/character-creation');
          else if (data.currentStep === 1) router.replace('/genre-selection');
          else if (data.currentStep === 2) router.replace('/coding-challenge');
          else if (data.currentStep === 3) router.replace('/design-studio');
          else router.replace('/character-creation'); // 알 수 없는 단계면 처음으로
          return; // 리다이렉트 후 함수 종료
        } else if (data.currentStep >= 5) { // 이미 팀 빌딩 이상 진행된 경우 (project-start 또는 그 이상)
          setError("이미 팀 빌딩을 완료했습니다. 다음 단계로 이동합니다.");
          router.replace('/project-start'); // 팀 빌딩 완료 후는 project-start 페이지
          return;
        }

      } else {
        // 문서가 없으면 새 게임 시작으로 유도
        setError("사용자 데이터를 찾을 수 없습니다. 새로운 게임을 시작합니다.");
        router.push('/character-creation');
      }
    } catch (err: any) { // err 타입 지정
      console.error("사용자 데이터 로드 실패:", err);
      setError("데이터를 불러오는 데 실패했습니다: " + err.message);
      router.push('/character-creation'); // 에러 발생 시 첫 단계로 이동
    } finally {
      setLoading(false);
    }
  }, [userId, router]); // userId를 의존성 배열에 추가

  // userId가 변경될 때마다 fetchUserData 호출
  useEffect(() => {
    if (userId) { // userId가 유효할 때만 데이터를 가져오도록
      fetchUserData();
    }
  }, [userId, fetchUserData]);

  // 고용 가능한 팀원 필터링
  const availableTeamMembers = allTeamMembers.filter(member =>
    !hiredTeam.some(hired => hired.id === member.id) && // 이미 고용되지 않은 팀원
    (member.minScoreToUnlock === undefined || userTotalScore >= member.minScoreToUnlock) // 점수 조건 충족
  );

  // 팀원 고용 함수
  const handleHireTeamMember = async (memberToHire: TeamMember) => {
    if (!userId) {
      setFeedback("로그인 정보가 없습니다. 다시 로그인 해주세요.");
      setTimeout(() => setFeedback(null), 2000);
      router.push('/login');
      return;
    }
    if (userMoney < memberToHire.cost) {
      setFeedback("돈이 부족합니다!");
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    setLoading(true);
    try {
      const newUserMoney = userMoney - memberToHire.cost;
      const newHiredTeam = [...hiredTeam, memberToHire];

      // Firebase 업데이트
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        'resources.money': newUserMoney,
        team: newHiredTeam,
        overallProgress: Math.min(100, userOverallProgress + 5), // 임의로 5% 증가
        updatedAt: serverTimestamp(),
      });

      // UI 상태 업데이트
      setUserMoney(newUserMoney);
      setHiredTeam(newHiredTeam);
      setUserOverallProgress(prev => Math.min(100, prev + 5));
      setFeedback(`${memberToHire.name}을(를) 고용했습니다!`);
      setTimeout(() => setFeedback(null), 2000);

    } catch (err: any) { // err 타입 지정
      console.error("팀원 고용 실패:", err);
      setFeedback("팀원 고용에 실패했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 다음 단계로 이동 조건 (예: 최소 2명 고용)
  const canProceedToNextStep = hiredTeam.length >= 2;

  const handleProceedToNextStep = async () => {
    if (!userId) {
      setFeedback("로그인 정보가 없습니다. 다시 로그인 해주세요.");
      setTimeout(() => setFeedback(null), 2000);
      router.push('/login');
      return;
    }
    if (!canProceedToNextStep) {
        setFeedback(`팀원 ${2 - hiredTeam.length}명 더 고용해야 다음 단계로 진행할 수 있습니다.`);
        setTimeout(() => setFeedback(null), 3000);
        return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 5, // 다음 단계로 이동 (프로젝트 시작)
        overallProgress: Math.min(100, userOverallProgress + (100 - userOverallProgress) / 2), // 남은 진행도 절반 채우기
        updatedAt: serverTimestamp(),
      });
      alert('팀 빌딩이 완료되었습니다! 이제 프로젝트를 시작할 준비가 되었습니다.');
      router.push('/project-start'); // 다음 페이지 경로
    } catch (err: any) { // err 타입 지정
      console.error("단계 업데이트 실패:", err);
      alert("다음 단계로 이동하는 데 실패했습니다.");
      setError("다음 단계로 이동 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 로딩 및 에러 상태 UI
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        데이터 로드 중...
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
        {error.includes("이전 단계로 이동합니다") && (
          <Button onClick={() => router.replace('/character-creation')} className="mt-4">
            이전 단계로 돌아가기
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
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">팀 빌딩</h1>
      <ProgressBar progress={userOverallProgress} barColorClass="bg-green-500" />
      <p className="text-center text-gray-600 mt-2 dark:text-gray-400">
        현재 보유 금액: <span className="font-bold text-green-500">${userMoney.toLocaleString()}</span> | 총점: {userTotalScore}
      </p>
      {feedback && (
        <p className={`text-center text-lg font-semibold mt-4 ${feedback.includes('부족') || feedback.includes('실패') ? 'text-red-500' : 'text-green-500'} dark:text-white`}>
          {feedback}
        </p>
      )}

      {/* 현재 고용된 팀원 */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">현재 팀원 ({hiredTeam.length}명)</h2>
        </Card.Header>
        <Card.Body>
          {hiredTeam.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">아직 고용된 팀원이 없습니다. 새로운 팀원을 찾아보세요!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hiredTeam.map(member => (
                <Card key={member.id} className="dark:bg-gray-700">
                  <div className="flex items-center gap-4">
                    <img src={member.imageSrc} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <h3 className="font-semibold text-xl dark:text-white">{member.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{member.role} (능력치: {member.skill})</p>
                      {member.specialty && <p className="text-sm text-gray-500 dark:text-gray-400">특기: {member.specialty}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* 고용 가능한 팀원 */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">고용 가능한 팀원</h2>
        </Card.Header>
        <Card.Body>
          {availableTeamMembers.length === 0 && userTotalScore < Math.max(...allTeamMembers.map(m => m.minScoreToUnlock || 0)) ? (
            <p className="text-gray-500 dark:text-gray-400">현재 고용 가능한 팀원이 없습니다. 총점을 더 높여보세요!</p>
          ) : availableTeamMembers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">모든 팀원을 고용했습니다!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTeamMembers.map(member => (
                <Card key={member.id} className="dark:bg-gray-700">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={member.imageSrc} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <h3 className="font-semibold text-xl dark:text-white">{member.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{member.role} (능력치: {member.skill})</p>
                      {member.specialty && <p className="text-sm text-gray-500 dark:text-gray-400">특기: {member.specialty}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">${member.cost.toLocaleString()}</span>
                    <Button
                      onClick={() => handleHireTeamMember(member)}
                      disabled={userMoney < member.cost || loading}
                      variant={userMoney < member.cost ? 'secondary' : 'primary'}
                    >
                      {userMoney < member.cost ? '돈 부족' : '고용하기'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="text-center mt-8">
        <Button onClick={handleProceedToNextStep} disabled={!canProceedToNextStep || loading}>
          {loading ? '진행 중...' : (canProceedToNextStep ? '다음 단계로 진행 (프로젝트 시작)' : `팀원 ${2 - hiredTeam.length}명 더 고용하기`)}
        </Button>
      </div>
    </div>
  );
}