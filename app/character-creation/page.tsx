// app/character-creation/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/clientConfig'; // Firebase 설정 파일 임포트
// 🔥 getDoc을 추가로 임포트합니다.
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'; // getDoc 추가
import Button from '@/components/ui/Button'; // 기존 Button 컴포넌트
import Card from '@/components/ui/Card'; // 기존 Card 컴포넌트

type CharacterType = 'coder' | 'artist' | 'planner';

const avatarImages = [
  '/avatars/avatar-01.png',
  '/avatars/avatar-02.png',
  // ... 8개 아바타 경로
];

export default function CharacterCreationPage() {
  const [selectedType, setSelectedType] = useState<CharacterType | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const router = useRouter();
  const userId = "test_user_id"; // TODO: Firebase Auth에서 실제 userId 가져오기

  const handleNext = async () => {
    if (selectedType && selectedAvatar && userId) {
      try {
        const userDocRef = doc(db, 'users', userId);
        // 🔥 사용자 문서의 현재 스냅샷을 가져옵니다.
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          // 🔥 문서가 존재하지 않으면, 초기 데이터와 함께 새로운 문서를 생성합니다.
          await setDoc(userDocRef, {
            userId: userId, // 사용자 ID도 문서 내에 저장
            currentStep: 1,
            character: {
              type: selectedType,
              avatarId: selectedAvatar,
            },
            totalScore: 0, // 초기 총점
            overallProgress: 0, // 초기 전체 진행도
            resources: {
              money: 1000, // 초기 자금 부여
              energy: 100, // 필요하다면 초기 에너지 등도
            },
            team: [], // 초기 팀원 없음 (빈 배열)
            createdAt: serverTimestamp(), // 최초 생성 시 타임스탬프
            updatedAt: serverTimestamp(),
          });
          console.log("새로운 사용자 문서 초기화 및 캐릭터 정보 저장 완료.");
        } else {
          // 🔥 문서가 이미 존재하면, 캐릭터 정보만 업데이트합니다.
          // merge: true를 사용하여 기존 필드는 유지하고 character 필드만 업데이트합니다.
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
      } catch (error) {
        console.error("캐릭터 정보 저장 실패:", error);
        alert("캐릭터 정보를 저장하는 데 실패했습니다. 다시 시도해주세요.");
      }
    } else {
      alert("개발자 타입과 아바타를 모두 선택해주세요!");
    }
  };

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
            {/* Next/image 사용 시 public 경로에서 바로 접근 가능 */}
            <img src={src} alt={`Avatar ${index + 1}`} className="w-full h-auto object-contain p-1" />
          </div>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={handleNext} disabled={!selectedType || !selectedAvatar}>
          다음 단계로
        </Button>
      </div>
    </div>
  );
}