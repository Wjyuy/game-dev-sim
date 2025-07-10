// types/game.ts

import { FieldValue } from 'firebase/firestore';
import { PlacedObject } from '@/utils/map_assets';
import { TeamMember } from '@/types/team';

export interface UserGameProgress {
  userId: string;
  currentStep: number;
  character: {
    type: 'coder' | 'artist' | 'planner' | null;
    avatarId: string | null;
  };
  genre: {
    selected: 'rpg' | 'puzzle' | 'action' | 'simulation' | null;
    marketDataSnapshot: { estimatedRevenue: number; difficulty: number; userBase: number; };
  };
  codingProgress: {
    currentStage: number;
    score: number;
    completed: boolean;
  };
  designProgress: {
    selectedPalette: string | null;
    selectedBackground: string | null;
    placedObjects: PlacedObject[];
    score: number;
    completed: boolean;
  };
  totalScore: number;
  overallProgress: number;
  
  resources: {
    money: number;
    energy: number;
  };
  team: TeamMember[];

  // 🔥🔥🔥 게임 개발 시뮬레이션 관련 필드 추가 🔥🔥🔥
  gameDevProgress: {
    currentWeek: number; // 현재 시뮬레이션 주차
    coding: {
      percentage: number; // 코딩 진행도 (%)
      bugs: number; // 발견된 버그 수 (나중에 활용)
    };
    art: {
      percentage: number; // 아트 진행도 (%)
    };
    design: {
      percentage: number; // 디자인/레벨 진행도 (%)
    };
    marketing: {
      percentage: number; // 마케팅 진행도 (%)
    };
    quality: number; // 최종 게임 품질 점수 (초기에는 팀원 스킬 합산 등으로 계산)
    isReleased: boolean; // 게임 출시 여부
    releaseRevenue?: number; // 출시 후 수익 (나중에 추가)
  };

  createdAt: FieldValue;
  updatedAt: FieldValue;
}