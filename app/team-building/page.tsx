// app/team-building/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/clientConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// UI 컴포넌트 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';

// 데이터 타입 및 데이터 임포트
import { allTeamMembers, TeamMember } from '@/types/team'; // 팀원 데이터 임포트
// UserGameProgress는 직접 사용하지 않지만, 데이터 구조를 이해하는 데 도움이 됩니다.
// import { UserGameProgress } from '@/types/game'; // 필요하다면 임포트

export default function TeamBuildingPage() {
  const router = useRouter();
  const userId = "test_user_id"; // TODO: 실제 userId (Firebase Auth 연동)

  // 사용자 게임 진행 상태
  const [userMoney, setUserMoney] = useState(0);
  const [userTotalScore, setUserTotalScore] = useState(0);
  const [userOverallProgress, setUserOverallProgress] = useState(0);
  const [hiredTeam, setHiredTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Firebase에서 사용자 데이터 로드
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        // 사용자 ID가 없으면 로그인 페이지로 리다이렉트 또는 에러 처리
        // router.push('/login');
        return;
      }
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserMoney(data.resources?.money || 0);
          setUserTotalScore(data.totalScore || 0);
          setUserOverallProgress(data.overallProgress || 0);
          // Firestore에서 가져온 team 배열을 TeamMember[] 타입으로 캐스팅
          setHiredTeam((data.team || []) as TeamMember[]);
        } else {
          // 문서가 없으면 초기 데이터 설정 (예: 튜토리얼 단계부터 시작)
          setUserMoney(1000); // 초기 자금 부여
          setUserTotalScore(0);
          setUserOverallProgress(0);
          setHiredTeam([]);
          // TODO: 새 사용자 문서 생성 로직 추가
        }
      } catch (error) {
        console.error("사용자 데이터 로드 실패:", error);
        setFeedback("데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId]);

  // 고용 가능한 팀원 필터링
  const availableTeamMembers = allTeamMembers.filter(member =>
    !hiredTeam.some(hired => hired.id === member.id) && // 이미 고용되지 않은 팀원
    (member.minScoreToUnlock === undefined || userTotalScore >= member.minScoreToUnlock) // 점수 조건 충족
  );

  // 팀원 고용 함수
  const handleHireTeamMember = async (memberToHire: TeamMember) => {
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
        team: newHiredTeam, // 고용된 팀원 정보 저장
        // 팀원 고용 시 전체 진행도도 업데이트 (예: 5단계 중 1단계)
        // 여기서는 간단하게 고용된 팀원 수에 비례하여 진행도 상승
        overallProgress: Math.min(100, userOverallProgress + 5), // 임의로 5% 증가
        updatedAt: serverTimestamp(),
      });

      // UI 상태 업데이트
      setUserMoney(newUserMoney);
      setHiredTeam(newHiredTeam);
      setUserOverallProgress(prev => Math.min(100, prev + 5)); // UI에도 즉시 반영
      setFeedback(`${memberToHire.name}을(를) 고용했습니다!`);
      setTimeout(() => setFeedback(null), 2000);

    } catch (error) {
      console.error("팀원 고용 실패:", error);
      setFeedback("팀원 고용에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 다음 단계로 이동 조건 (예: 최소 2명 고용)
  const canProceedToNextStep = hiredTeam.length >= 2;

  const handleProceedToNextStep = async () => {
    // Firebase에 현재 단계 업데이트 (5단계: 팀 빌딩 완료)
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 5, // 다음 단계로 이동
        overallProgress: Math.min(100, userOverallProgress + (100 - userOverallProgress) / 2), // 남은 진행도 절반 채우기
        updatedAt: serverTimestamp(),
      });
      alert('팀 빌딩이 완료되었습니다! 이제 프로젝트를 시작할 준비가 되었습니다.');
      router.push('/project-start'); // 다음 페이지 경로
    } catch (error) {
      console.error("단계 업데이트 실패:", error);
      alert("다음 단계로 이동하는 데 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        데이터 로드 중...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">팀 빌딩</h1>
      <ProgressBar progress={userOverallProgress} barColorClass="bg-green-500" />
      <p className="text-center text-gray-600 mt-2 dark:text-gray-400">
        현재 보유 금액: <span className="font-bold text-green-500">${userMoney}</span> | 총점: {userTotalScore}
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
          {availableTeamMembers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">현재 고용 가능한 팀원이 없습니다. 총점을 더 높여보세요!</p>
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
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">${member.cost}</span>
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
          {canProceedToNextStep ? '다음 단계로 진행 (프로젝트 시작)' : `팀원 ${2 - hiredTeam.length}명 더 고용하기`}
        </Button>
      </div>
    </div>
  );
}