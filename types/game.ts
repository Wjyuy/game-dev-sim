// types/game.ts

import { FieldValue } from 'firebase/firestore';
import { PlacedObject } from '@/utils/map_assets';
import { TeamMember } from '@/types/team';

export interface UserGameProgress { // export 키워드 확인!
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
    energy: number; // 전체 에너지 자원 (추후 사용)
  };
  team: TeamMember[];

  gameDevProgress: {
    currentWeek: number;
    coding: {
      percentage: number;
      bugs: number;
    };
    art: {
      percentage: number;
    };
    design: {
      percentage: number;
    };
    marketing: {
      percentage: number;
    };
    quality: number; // 최종 게임 품질 점수
    isReleased: boolean;
    releaseRevenue?: number;
  };

  createdAt: FieldValue;
  updatedAt: FieldValue;
}