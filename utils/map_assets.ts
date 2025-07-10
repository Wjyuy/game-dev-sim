// types/map_assets.ts

export interface MapBackground {
  id: string;
  name: string;
  src: string; // public 폴더 기준 경로
  scoreMultiplier: number; // 이 배경 선택 시 점수 가중치 (옵션)
}

export const mapBackgrounds: MapBackground[] = [
  { id: 'grass', name: '초원 지대', src: '/maps/grass_map.png', scoreMultiplier: 1.0 },
  { id: 'sand', name: '사막 지대', src: '/maps/sand_map.png', scoreMultiplier: 1.1 },
  { id: 'snow', name: '설원 지대', src: '/maps/snow_map.png', scoreMultiplier: 1.2 },
];

export interface DesignObject {
  id: string;
  name: string;
  src: string; // public 폴더 기준 경로
  width: number; // 캔버스에 그려질 기본 너비 (픽셀)
  height: number; // 캔버스에 그려질 기본 높이 (픽셀)
  scoreValue: number; // 이 오브젝트 배치 시 얻는 점수
}

export const designObjects: DesignObject[] = [
  { id: 'tree', name: '나무', src: '/objects/tree.png', width: 32, height: 48, scoreValue: 10 },
  { id: 'rock', name: '바위', src: '/objects/rock.png', width: 24, height: 24, scoreValue: 5 },
  { id: 'house', name: '집', src: '/objects/house.png', width: 64, height: 64, scoreValue: 30 },
];

// 캔버스에 배치된 오브젝트의 타입 (위치 정보 포함)
export interface PlacedObject extends DesignObject {
  x: number;
  y: number;
}