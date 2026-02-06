import { QuizMode, StreakEffect } from '../types';

// XP Configuration
const BASE_XP = 100;
const STREAK_BONUS_PER = 20;
const SPEED_BONUS_FAST = 30; // < 50% time used
const SPEED_BONUS_MEDIUM = 15; // < 75% time used

// Level thresholds (cumulative XP)
const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800, 2500, 3200, 3900, 4700, 5600, 6600, 7700, 8900, 10200];

export function calculateXP(
  correct: boolean,
  streak: number,
  timeTaken: number | undefined,
  timeAllowed: number | undefined,
  mode: QuizMode
): number {
  if (!correct) return 0;

  let xp = BASE_XP;

  // Streak bonus
  if (streak > 0) {
    xp += streak * STREAK_BONUS_PER;
  }

  // Speed bonus (only in timed mode)
  if (mode === 'timed' && timeTaken !== undefined && timeAllowed !== undefined && timeAllowed > 0) {
    const pctUsed = timeTaken / timeAllowed;
    if (pctUsed < 0.5) {
      xp += SPEED_BONUS_FAST;
    } else if (pctUsed < 0.75) {
      xp += SPEED_BONUS_MEDIUM;
    }
  }

  return xp;
}

export function getLevelFromXP(totalXP: number): number {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

export function getXPForCurrentLevel(totalXP: number): { current: number; needed: number; progress: number } {
  const level = getLevelFromXP(totalXP);
  const currentThreshold = LEVEL_THRESHOLDS[level] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || currentThreshold + 800;

  const current = totalXP - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  const progress = needed > 0 ? Math.min((current / needed) * 100, 100) : 100;

  return { current, needed, progress };
}

export function calculateStars(
  correct: boolean,
  timeTaken: number | undefined,
  timeAllowed: number | undefined,
  mode: QuizMode,
  streak: number
): number {
  if (!correct) return 0;

  if (mode === 'timed' && timeTaken !== undefined && timeAllowed !== undefined && timeAllowed > 0) {
    const pctUsed = timeTaken / timeAllowed;
    if (pctUsed < 0.5) return 3;
    if (pctUsed < 0.75) return 2;
    return 1;
  }

  // Self-paced: based on streak
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export function getStreakEffect(streak: number): StreakEffect {
  if (streak >= 5) return 'onFire';
  if (streak >= 3) return 'streak';
  return 'none';
}

export function getStreakLabel(streak: number): string {
  if (streak >= 5) return 'onFire';
  if (streak >= 3) return 'streak';
  return '';
}

export { LEVEL_THRESHOLDS };
