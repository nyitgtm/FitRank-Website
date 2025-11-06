import { Team } from './types';

export function getTeamById(teams: Team[], teamRef: string): Team | undefined {
  const teamId = teamRef.split('/').pop();
  return teams.find(t => t.id === teamId);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export const LIFT_TYPE_DISPLAY: Record<string, string> = {
  bench: 'Bench Press',
  squat: 'Squat',
  deadlift: 'Deadlift',
};

export const LIFT_TYPE_ICONS: Record<string, string> = {
  bench: '🏋️',
  squat: '🦵',
  deadlift: '💪',
};
