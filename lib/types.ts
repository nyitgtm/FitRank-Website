export interface User {
  id: string;
  name: string;
  team: string;
  isCoach: boolean;
  username: string;
  tokens: number;
  isDarkMode?: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  slug: string;
  icon?: string;
}

export interface Workout {
  id: string;
  userId: string;
  createdAt: Date;
  teamId: string;
  videoUrl: string;
  weight: number;
  liftType: 'bench' | 'squat' | 'deadlift';
  gymId?: string;
  status: 'published' | 'pending' | 'removed';
  views: number;
  upvotes: number;
  downvotes: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  userId: string;
  userName: string;
  username: string;
  team: string;
  score: number;
  scoreType: 'tokens' | 'weight';
  liftType?: 'bench' | 'squat' | 'deadlift';
}

export type LiftType = 'bench' | 'squat' | 'deadlift';
export type ScoreType = 'tokens' | 'weight';
export type LeaderboardTab = 'global' | 'team' | 'following';
