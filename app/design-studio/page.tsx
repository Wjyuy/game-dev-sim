// app/design-studio/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/clientConfig';
import { doc, getDoc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore'; // FieldValue 추가

// UI 컴포넌트 임포트 (경로 확인, 만약 ui 폴더 아래 없다면 조정)
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar'; 

// 자산 데이터 임포트
import {
  MapBackground,
  mapBackgrounds,
  DesignObject,
  designObjects,
  PlacedObject
} from '@/utils/map_assets'; // 경로에 맞게 조정하세요!

// 색상 팔레트 데이터 (design-studio/page.tsx에 직접 정의 또는 별도 파일로 분리 가능)
const colorPalettes = [
  { id: 'forest', name: 'Forest', colors: ['#A0B099', '#789066', '#546045'] },
  { id: 'desert', name: 'Desert', colors: ['#D2B48C', '#F4A460', '#B8860B'] },
  { id: 'ocean', name: 'Ocean', colors: ['#ADD8E6', '#87CEEB', '#4682B4'] },
  { id: 'sunset', name: 'Sunset', colors: ['#FFDAB9', '#FFB6C1', '#CD5C5C'] },
];

export default function DesignStudioPage() {
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(mapBackgrounds[0].id);
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [designScore, setDesignScore] = useState(0);
  const [codingScore, setCodingScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  const router = useRouter();
  const userId = "test_user_id"; // TODO: 실제 userId 가져오기 (Firebase Auth 연동 시 변경)

  // Canvas 관련 Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const objImagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Firebase에서 초기 사용자 데이터 (코딩 점수 등) 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return; // userId가 없으면 로드하지 않음 (로그인 전)
      try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCodingScore(data.codingProgress?.score || 0);
          setTotalScore(data.totalScore || 0);
          setOverallProgress(data.overallProgress || 0);
          setSelectedPalette(data.designProgress?.selectedPalette || null);
          setSelectedBackgroundId(data.designProgress?.selectedBackground || mapBackgrounds[0].id);
          // Firestore에서 가져온 placedObjects 배열의 타입을 명시적으로 지정
          setPlacedObjects((data.designProgress?.placedObjects || []) as PlacedObject[]);
          setDesignScore(data.designProgress?.score || 0);
        }
      } catch (error) {
        console.error("사용자 데이터 로드 실패:", error);
      }
    };
    fetchUserData();
  }, [userId]);


  // 이미지 로드 및 캔버스 그리기 함수
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 배경 이미지 그리기 (이 부분은 문제가 없을 것으로 예상)
    const currentBg = mapBackgrounds.find(bg => bg.id === selectedBackgroundId);
    if (currentBg) {
      if (!bgImageRef.current || bgImageRef.current.src !== window.location.origin + currentBg.src) {
        bgImageRef.current = new Image();
        bgImageRef.current.src = currentBg.src; // public 경로 사용
        bgImageRef.current.onload = () => {
          drawMap();
        };
      } else if (bgImageRef.current.complete) {
        ctx.drawImage(bgImageRef.current, 0, 0, rect.width, rect.height);
      }
    } else {
      ctx.fillStyle = selectedPalette ? colorPalettes.find(p => p.id === selectedPalette)?.colors[0] || 'lightgray' : 'lightgray';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // 2. 배치된 오브젝트 그리기
    placedObjects.forEach(placedObj => { // placedObj로 이름 변경하여 혼동 방지
        // 🔥🔥 핵심 변경: designObjects에서 원본 오브젝트 데이터 찾기 🔥🔥
        const originalObj = designObjects.find(obj => obj.id === placedObj.id);
        if (!originalObj) {
            console.warn(`Original object data not found for ID: ${placedObj.id}`);
            return; // 원본 데이터를 찾을 수 없으면 그리지 않음
        }

        // 오브젝트 이미지 로드 (각 이미지 객체는 한 번만 생성 및 로드되도록 관리)
        if (!objImagesRef.current[originalObj.id]) { // originalObj.id 사용
            const img = new Image();
            img.src = originalObj.src; // originalObj.src 사용
            objImagesRef.current[originalObj.id] = img;
            img.onload = () => {
                drawMap(); // 이미지가 로드되면 캔버스 다시 그리기
            };
        }
        const img = objImagesRef.current[originalObj.id];

        if (img && img.complete) {
            // 이미지 로드 완료 시 그리기
            ctx.drawImage(img, placedObj.x, placedObj.y, originalObj.width, originalObj.height); // originalObj.width/height 사용
        } else if (img && img.naturalWidth === 0 && img.naturalHeight === 0) {
            // 이미지가 'broken' 상태일 경우 경고
            console.error(`Broken image detected for: ${originalObj.src}`);
        }
    });


     // (옵션) 선택된 팔레트에 따른 시각적 효과 (예: 전체 맵에 필터 적용)
    if (selectedPalette) {
      const palette = colorPalettes.find(p => p.id === selectedPalette);
      if (palette) {
        // 예시: 캔버스 전체에 팔레트 색상으로 오버레이
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = palette.colors[0];
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.globalAlpha = 1.0;
      }
    }

  }, [selectedBackgroundId, placedObjects, selectedPalette]);

  // 캔버스 그리기 함수를 의존성으로 추가하여 상태 변화 시 재렌더링
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // 드래그 앤 드롭 로직
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, objectId: string) => {
    setDraggedObjectId(objectId);
    e.dataTransfer.setData('text/plain', objectId); // 드래그된 오브젝트 ID 저장
    e.dataTransfer.effectAllowed = 'copy'; // 복사 효과 (원래 위치에 남아있음)
  };

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // 드롭 허용
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData('text/plain');
    const objectData = designObjects.find(obj => obj.id === droppedId);

    if (objectData) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // 캔버스 내에서의 정확한 드롭 좌표 계산 (DPI 고려)
      const x = (e.nativeEvent.offsetX / rect.width) * (canvas.width / dpr) - objectData.width / 2;
      const y = (e.nativeEvent.offsetY / rect.height) * (canvas.height / dpr) - objectData.height / 2;

      const newPlacedObject: PlacedObject = {
        ...objectData,
        // 캔버스 경계를 넘지 않도록 제한
        x: Math.max(0, Math.min(x, (canvas.width / dpr) - objectData.width)),
        y: Math.max(0, Math.min(y, (canvas.height / dpr) - objectData.height)),
      };
      setPlacedObjects(prev => [...prev, newPlacedObject]);
      setDraggedObjectId(null); // 드래그 상태 초기화
    }
  };

  // 디자인 점수 계산 함수
  const calculateDesignScore = useCallback((): number => {
    let score = 50; // 기본 점수

    // 배경 점수
    const selectedBg = mapBackgrounds.find(bg => bg.id === selectedBackgroundId);
    if (selectedBg) {
      score += (selectedBg.scoreMultiplier - 1) * 50; // 예: 1.1이면 5점 추가
    }

    // 오브젝트 점수
    placedObjects.forEach(obj => {
      score += obj.scoreValue;
    });

    // (선택 사항) 다양성 보너스 - 모든 종류의 오브젝트를 배치했는지?
    const uniqueObjectTypes = new Set(placedObjects.map(obj => obj.id));
    if (uniqueObjectTypes.size === designObjects.length && designObjects.length > 0) {
      score += 30; // 모든 종류의 오브젝트 배치 시 보너스
    }

    return Math.max(0, Math.floor(score)); // 점수는 0 이상 정수
  }, [selectedBackgroundId, placedObjects]);

  // 점수 및 진행도 업데이트 (디자인 점수 변경 시 총점 및 진행도 계산)
  useEffect(() => {
    const currentDesignScore = calculateDesignScore();
    setDesignScore(currentDesignScore);

    // 전체 진행도 계산 (예시: 각 단계별 가중치를 부여하여 계산)
    // 캐릭터 생성, 장르 선택, 코딩 챌린지, 디자인 스튜디오 (각 25%씩)
    const initialProgress = 25; // 캐릭터 생성 + 장르 선택 완료 시 25% 가정

    // 코딩 챌린지 완료 여부/점수에 따른 가중치 (예: 25% 할당)
    const codingProgressWeight = 25;
    // (여기서는 codingScore만 불러와서, 실제 완료 여부는 고려하지 않고 점수만 반영)
    // 실제로는 `codingProgress.completed` 여부에 따라 이 부분을 조절할 수 있습니다.
    const codingProgressContribution = (codingScore / (5 * 10)) * codingProgressWeight; // 5단계 * 10점 만점 가정

    // 디자인 스튜디오 완료 여부/점수에 따른 가중치 (예: 25% 할당)
    const designProgressWeight = 25;
    const maxDesignScore = 50 + (mapBackgrounds[mapBackgrounds.length - 1].scoreMultiplier - 1) * 50 + designObjects.reduce((sum, obj) => sum + obj.scoreValue, 0) + 30; // 예상 최대 점수
    const designProgressContribution = (currentDesignScore / maxDesignScore) * designProgressWeight;

    // 총점과 진행도 계산
    const calculatedTotalScore = codingScore + currentDesignScore;
    const calculatedOverallProgress = Math.min(100, Math.round(initialProgress + codingProgressContribution + designProgressContribution));

    setTotalScore(calculatedTotalScore);
    setOverallProgress(calculatedOverallProgress);

  }, [codingScore, calculateDesignScore]);


  const handleDesignComplete = async () => {
    if (!selectedPalette || !selectedBackgroundId) {
      alert("색상 팔레트와 배경을 모두 선택해주세요!");
      return;
    }

    // 최종 점수 및 진행도 계산 (useEffect에서 이미 계산됨)
    // const finalDesignScore = calculateDesignScore(); // 이미 상태에 반영됨
    // const finalTotalScore = codingScore + finalDesignScore; // 이미 상태에 반영됨
    
    // Firebase에 진행 상황 업데이트
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 4, // 디자인 스튜디오 단계 완료
        'designProgress.selectedPalette': selectedPalette,
        'designProgress.selectedBackground': selectedBackgroundId,
        'designProgress.placedObjects': placedObjects.map(({ id, x, y }) => ({ id, x, y })), // ID, X, Y만 저장 (이미지 경로 등은 에셋 파일에 있으므로)
        'designProgress.score': designScore, // 현재 계산된 디자인 점수
        'designProgress.completed': true, // 디자인 단계 완료
        totalScore: totalScore, // 현재 계산된 총점
        overallProgress: overallProgress, // 현재 계산된 전체 진행도
        updatedAt: serverTimestamp(),
      });
      
      alert('디자인이 완료되었습니다! 다음 단계로 이동합니다.');
      router.push('/team-building'); // 다음 페이지로 이동
    } catch (error) {
      console.error("Firebase 업데이트 실패:", error);
      alert("디자인 정보를 저장하는 데 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">게임 디자인 스튜디오</h1>
      <ProgressBar progress={overallProgress} />
      <p className="text-center text-gray-600 mt-2 dark:text-gray-400">
        현재 코딩 점수: {codingScore} | 디자인 점수: {designScore} | 총점: {totalScore}
      </p>

      {/* 맵 배경 선택 */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">맵 배경 선택</h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {mapBackgrounds.map((bg) => (
              <div
                key={bg.id}
                className={`cursor-pointer border-2 p-2 rounded-lg flex flex-col items-center justify-center transition-all duration-200
                  ${selectedBackgroundId === bg.id ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-200'}
                  dark:border-gray-700
                `}
                onClick={() => setSelectedBackgroundId(bg.id)}
              >
                <img src={bg.src} alt={bg.name} className="w-full h-24 object-cover rounded mb-2" />
                <h3 className="font-medium dark:text-white">{bg.name}</h3>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* 오브젝트 팔레트 */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">오브젝트 팔레트</h2>
        </Card.Header>
        <Card.Body>
          <div className="flex flex-wrap gap-4">
            {designObjects.map((obj) => (
              <div
                key={obj.id}
                className="p-2 border border-gray-200 rounded-lg cursor-grab bg-white dark:bg-gray-700 dark:border-gray-600"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, obj.id)}
              >
                <img src={obj.src} alt={obj.name} className="w-12 h-12 object-contain mx-auto" />
                <p className="text-sm text-center mt-1 dark:text-white">{obj.name}</p>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* 게임 맵 미리보기 (캔버스) */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">맵 미리보기</h2>
        </Card.Header>
        <Card.Body>
          <div className="relative w-full h-[400px] overflow-hidden rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            ></canvas>
            <p className="absolute bottom-2 right-2 text-gray-400 text-sm">오브젝트를 캔버스에 드래그하여 배치하세요.</p>
          </div>
        </Card.Body>
      </Card>

      {/* 색상 팔레트 선택 (기존과 동일) */}
      <Card className="my-6 dark:bg-gray-800">
        <Card.Header>
          <h2 className="text-2xl font-semibold dark:text-white">색상 팔레트 선택</h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {colorPalettes.map((palette) => (
              <div
                key={palette.id}
                className={`cursor-pointer border-2 p-2 rounded-lg transition-all duration-200
                  ${selectedPalette === palette.id ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-200'}
                  dark:border-gray-700
                `}
                onClick={() => setSelectedPalette(palette.id)}
              >
                <h3 className="font-medium mb-2 dark:text-white">{palette.name}</h3>
                <div className="flex space-x-1">
                  {palette.colors.map((color, idx) => (
                    <div key={idx} className="w-8 h-8 rounded" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      <div className="text-center mt-8">
        <Button onClick={handleDesignComplete} disabled={!selectedPalette || !selectedBackgroundId}>
          디자인 완료!
        </Button>
      </div>
    </div>
  );
}