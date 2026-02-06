export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'matching' | 'multi_select';
export type QuizStatus = 'draft' | 'published';
export type QuizMode = 'timed' | 'self_paced';

export interface MCQQuestion {
  id: string;
  type: 'mcq';
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface TrueFalseQuestion {
  id: string;
  type: 'true_false';
  question: string;
  correctAnswer: boolean;
}

export interface FillBlankQuestion {
  id: string;
  type: 'fill_blank';
  question: string;
  acceptedAnswers: string[];
  caseSensitive: boolean;
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingQuestion {
  id: string;
  type: 'matching';
  question: string;
  pairs: MatchingPair[];
}

export interface MultiSelectQuestion {
  id: string;
  type: 'multi_select';
  question: string;
  options: string[];
  correctIndices: number[];
}

export type Question = MCQQuestion | TrueFalseQuestion | FillBlankQuestion | MatchingQuestion | MultiSelectQuestion;

export interface QuizSettings {
  mode: QuizMode;
  timePerQuestion: number; // seconds
  shuffleQuestions: boolean;
  showCorrectAfterEach: boolean;
}

export interface QuizData {
  id: string;
  title: string;
  description: string;
  status: QuizStatus;
  questions: Question[];
  settings: QuizSettings;
  attemptCount: number;
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  studentAnswer: string | number | boolean | number[] | Record<string, string>;
  timeTaken?: number; // seconds
  xpEarned?: number;
  starsEarned?: number;
  streakCount?: number;
}

export interface GameState {
  totalXP: number;
  level: number;
  streak: number;
  starsPerQuestion: number[];
  xpPerQuestion: number[];
  showLevelUp: boolean;
  previousLevel: number;
}

export type StreakEffect = 'none' | 'streak' | 'onFire';

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentName: string;
  results: QuestionResult[];
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface AppState {
  quizzes: QuizData[];
  attempts: QuizAttempt[];
}

export interface SubmissionQuestionData {
  questionId: string;
  question: string;
  type: QuestionType;
  options?: string[];
  pairs?: MatchingPair[];
  studentAnswer: string | number | boolean | number[] | Record<string, string>;
  correct: boolean;
  correctAnswer: string;
  timeTaken?: number;
  xpEarned?: number;
  starsEarned?: number;
}

export interface SubmissionContent {
  quizId: string;
  quizTitle: string;
  mode: QuizMode;
  timePerQuestion?: number;
  totalQuestions: number;
  correctAnswers: number;
  totalXP: number;
  level: number;
  totalStars: number;
  bestStreak: number;
  questions: SubmissionQuestionData[];
}

export interface SubmissionResponse {
  id: number;
  content: string; // JSON stringified SubmissionContent
  score: number;
  status: string;
  created_at?: string;
  student_name?: string;
  [key: string]: any;
}

export const DEFAULT_SETTINGS: QuizSettings = {
  mode: 'self_paced',
  timePerQuestion: 30,
  shuffleQuestions: false,
  showCorrectAfterEach: true,
};
