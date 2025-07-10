// types/team.ts

export interface TeamMember {
  id: string;
  name: string;
  role: 'programmer' | 'artist' | 'designer' | 'marketing' | 'leader';
  skill: number; // 능력치 (예: 1~100)
  cost: number; // 고용 비용
  specialty?: string; // 특기 (예: 'AI', 'UX', 'Pixel Art')
  morale: number; // 초기 사기 (morale 대신 energy 사용 가능)
  currentEnergy?: number; // ⭐ 새로 추가: 현재 에너지/활력 (0-100)
  imageSrc: string; // public/team_members/ 에 있을 이미지 경로
  minScoreToUnlock?: number; // 이 팀원을 고용하기 위한 최소 totalScore
}

// 잠재적 팀원 데이터 (기존 데이터 유지)
export const allTeamMembers: TeamMember[] = [
  { id: 'dev_rookie', name: '초보 개발자', role: 'programmer', skill: 30, cost: 500, specialty: 'Bug Fixing', morale: 70, imageSrc: '/team_members/dev_rookie.png', minScoreToUnlock: 0 },
  { id: 'art_apprentice', name: '미술 견습생', role: 'artist', skill: 25, cost: 400, specialty: 'Basic UI', morale: 75, imageSrc: '/team_members/art_apprentice.png', minScoreToUnlock: 0 },
  { id: 'des_junior', name: '주니어 기획자', role: 'designer', skill: 35, cost: 600, specialty: 'Simple Levels', morale: 80, imageSrc: '/team_members/des_junior.png', minScoreToUnlock: 0 },
  { id: 'dev_pro', name: '베테랑 개발자', role: 'programmer', skill: 70, cost: 2500, specialty: 'Game Engine', morale: 85, imageSrc: '/team_members/dev_pro.png', minScoreToUnlock: 500 },
  { id: 'art_expert', name: '컨셉 아티스트', role: 'artist', skill: 75, cost: 2800, specialty: 'Character Design', morale: 88, imageSrc: '/team_members/art_expert.png', minScoreToUnlock: 600 },
  { id: 'des_senior', name: '시니어 기획자', role: 'designer', skill: 80, cost: 3000, specialty: 'Gameplay Loop', morale: 92, imageSrc: '/team_members/des_senior.png', minScoreToUnlock: 700 },
  { id: 'leader_ceo', name: '최고 경영자', role: 'leader', skill: 90, cost: 5000, specialty: 'Team Management', morale: 95, imageSrc: '/team_members/leader_ceo.png', minScoreToUnlock: 1000 },
  { id: 'prog_ninja', name: '코드 닌자', role: 'programmer', skill: 95, cost: 4500, specialty: 'Optimization', morale: 90, imageSrc: '/team_members/prog_ninja.png', minScoreToUnlock: 900 },
];