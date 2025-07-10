// app/character-creation/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react'; // useEffect, useCallback 추가
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/clientConfig'; // 🔥 auth 임포트
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth'; // 🔥 Firebase User 타입 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';


type CharacterType = 'coder' | 'artist' | 'planner';

const avatarImages = [
  '/avatars/avatar-01.png',
  '/avatars/avatar-02.png',
  '/avatars/avatar-03.png',
  '/avatars/avatar-04.png',
  '/avatars/avatar-05.png',
  '/avatars/avatar-06.png',
  '/avatars/avatar-07.png',
  '/avatars/avatar-08.png',
];

export default function CharacterCreationPage() {
  const [selectedType, setSelectedType] = useState<CharacterType | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // ⭐ userId 상태 추가
  const [loading, setLoading] = useState(true); // ⭐ 로딩 상태 추가
  const [error, setError] = useState<string | null>(null); // ⭐ 에러 상태 추가
  const router = useRouter();

  // ⭐ Firebase Auth 상태 변경 리스너 ⭐
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        // 사용자가 로그인한 경우
        setUserId(currentUser.uid);
        setLoading(false); // 로딩 완료
      } else {
        // 사용자가 로그인되지 않은 경우
        setUserId(null);
        setLoading(false); // 로딩 완료
        // 로그인 페이지 또는 다른 시작 페이지로 리다이렉트
        // router.replace('/login'); // TODO: 실제 로그인 페이지 경로로 변경
        setError("로그인이 필요합니다."); // 임시 에러 메시지
      }
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [router]);


  const handleNext = async () => {
    if (!userId) {
      alert("로그인 정보가 없습니다. 다시 로그인 해주세요.");
      // router.push('/login'); // TODO: 실제 로그인 페이지 경로로 변경
      return;
    }
    if (!selectedType || !selectedAvatar) {
      alert("개발자 타입과 아바타를 모두 선택해주세요!");
      return;
    }

    setLoading(true); // 데이터 저장 시작 시 로딩
    try {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        // 문서가 존재하지 않으면, 초기 데이터와 함께 새로운 문서를 생성합니다.
        await setDoc(userDocRef, {
          userId: userId,
          currentStep: 1,
          character: {
            type: selectedType,
            avatarId: selectedAvatar,
          },
          totalScore: 0,
          overallProgress: 0,
          resources: {
            money: 10000, // 초기 자금 부여 (팀빌딩 페이지와 일관성 유지)
            energy: 100,
          },
          team: [],
          gameDevProgress: { // gameDevProgress 초기화 추가
            currentWeek: 0,
            coding: { percentage: 0, bugs: 0 },
            art: { percentage: 0 },
            design: { percentage: 0 },
            marketing: { percentage: 0 },
            quality: 0,
            isReleased: false,
            releaseRevenue: 0,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("새로운 사용자 문서 초기화 및 캐릭터 정보 저장 완료.");
      } else {
        // 문서가 이미 존재하면, 캐릭터 정보만 업데이트합니다.
        await setDoc(userDocRef, {
          currentStep: 1,
          character: {
            type: selectedType,
            avatarId: selectedAvatar,
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log("기존 사용자 문서에 캐릭터 정보 업데이트 완료.");
      }
      
      router.push('/genre-selection');
    } catch (err) { // error 변수명을 err로 변경하여 충돌 방지
      console.error("캐릭터 정보 저장 실패:", err);
      alert("캐릭터 정보를 저장하는 데 실패했습니다. 다시 시도해주세요.");
      setError("캐릭터 정보 저장 실패.");
    } finally {
      setLoading(false); // 로딩 해제
    }
  };

  // ⭐ 로딩 및 에러 상태 처리 ⭐
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        로그인 상태 확인 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 text-xl text-center">
        오류: {error}
        {/* 로그인 페이지로 이동 버튼 등 추가 가능 */}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        로그인이 필요합니다.
        {/* <Button onClick={() => router.push('/login')} className="mt-4">로그인 페이지로</Button> */}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">당신은 어떤 개발자가 되고 싶나요?</h1>
      
      {/* 개발자 타입 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {['coder', 'artist', 'planner'].map((type) => (
          <Card
            key={type}
            onClick={() => setSelectedType(type as CharacterType)}
            className={`cursor-pointer ${selectedType === type ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-200'} transition-all duration-200 dark:border-gray-700`}
            hover
          >
            <Card.Body>
              <h2 className="text-xl font-semibold mb-2 capitalize dark:text-white">{type}</h2>
              <p className="text-gray-600 dark:text-gray-400">
                {type === 'coder' && '코드에 생명을 불어넣는 마법사. 논리적 사고와 문제 해결 능력의 달인.'}
                {type === 'artist' && '아름다운 시각적 경험을 창조하는 장인. 창의력과 미적 감각의 소유자.'}
                {type === 'planner' && '게임의 비전을 제시하고 팀을 이끄는 리더. 전략적 사고와 소통 능력의 대가.'}
              </p>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* 아바타 선택 */}
      <h2 className="text-3xl font-bold text-center mb-6 dark:text-white">당신의 아바타를 선택하세요!</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 mb-12">
        {avatarImages.map((src, index) => (
          <div
            key={index}
            className={`cursor-pointer border-2 p-2 rounded-lg flex items-center justify-center transition-all duration-200
              ${selectedAvatar === src ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-200'} dark:border-gray-700
            `}
            onClick={() => setSelectedAvatar(src)}
          >
            <img src={src} alt={`Avatar ${index + 1}`} className="w-full h-auto object-contain p-1" />
          </div>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={handleNext} disabled={!selectedType || !selectedAvatar || loading}>
          {loading ? '저장 중...' : '다음 단계로'}
        </Button>
      </div>
    </div>
  );
}