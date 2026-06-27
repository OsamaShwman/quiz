import { QuizMode, StreakEffect, QuestionDifficulty } from '../types';

// XP Configuration
// Base XP per difficulty level
const XP_BY_DIFFICULTY: Record<QuestionDifficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
  super_hard: 30,
};
const DEFAULT_DIFFICULTY: QuestionDifficulty = 'medium';
const HINT_PENALTY = 0.3;       // -30% if hint was used
const FIRST_TRY_BONUS = 0.1;    // +10% if this is the student's first attempt at the quiz
const STREAK_BONUS_PER = 2;     // small streak bonus per consecutive correct
const SPEED_BONUS_FAST = 3;     // < 50% time used
const SPEED_BONUS_MEDIUM = 1;   // < 75% time used

// Level thresholds (cumulative XP)
const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800, 2500, 3200, 3900, 4700, 5600, 6600, 7700, 8900, 10200];

export interface XPCalcArgs {
  correct: boolean;
  difficulty?: QuestionDifficulty;
  hintUsed?: boolean;
  isFirstAttempt?: boolean; // first time taking this quiz (not a retake)
  streak?: number;
  timeTaken?: number;
  timeAllowed?: number;
  mode?: QuizMode;
}

/**
 * Calculate XP earned for a question.
 * Base value comes from question difficulty:
 *   easy=10, medium=15, hard=20, super_hard=30
 * Modifiers:
 *   - hintUsed: -30%
 *   - isFirstAttempt + correct: +10%
 *   - small streak/speed bonuses on top
 */
export function calculateXP(args: XPCalcArgs): number {
  if (!args.correct) return 0;

  const diff = args.difficulty || DEFAULT_DIFFICULTY;
  let xp = XP_BY_DIFFICULTY[diff];

  // Apply hint penalty
  if (args.hintUsed) xp = xp * (1 - HINT_PENALTY);
  // First-try bonus
  if (args.isFirstAttempt) xp = xp * (1 + FIRST_TRY_BONUS);

  // Round after modifiers so the base feels predictable
  xp = Math.round(xp);

  // Small streak bonus (kept minor since base is small now)
  if (args.streak && args.streak > 0) xp += args.streak * STREAK_BONUS_PER;

  // Speed bonus only in timed mode
  if (args.mode === 'timed' && args.timeTaken !== undefined && args.timeAllowed && args.timeAllowed > 0) {
    const pctUsed = args.timeTaken / args.timeAllowed;
    if (pctUsed < 0.5) xp += SPEED_BONUS_FAST;
    else if (pctUsed < 0.75) xp += SPEED_BONUS_MEDIUM;
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
