import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { Question, QuestionResult, QuizData } from '../types';
import { QuizQuestion } from '../components/QuizQuestion';
import { TimerBar } from '../components/TimerBar';
import { Button } from '../components/Button';
import { Icons, TOKENS } from '../constants';

type SessionPhase = 'start' | 'quiz' | 'results';

const CONFETTI_COLORS = ['#ed3b91', '#08b8fb', '#22c55e', '#f59e0b', '#a855f7'];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function checkAnswer(question: Question, answer: string | number | boolean | Record<string, string>): { correct: boolean; correctAnswer: string } {
  switch (question.type) {
    case 'mcq':
      return {
        correct: answer === question.correctIndex,
        correctAnswer: question.options[question.correctIndex],
      };
    case 'true_false':
      return {
        correct: answer === question.correctAnswer,
        correctAnswer: String(question.correctAnswer),
      };
    case 'fill_blank': {
      const studentAns = String(answer);
      const isCorrect = question.acceptedAnswers.some(a =>
        question.caseSensitive ? a === studentAns : a.toLowerCase() === studentAns.toLowerCase()
      );
      return {
        correct: isCorrect,
        correctAnswer: question.acceptedAnswers[0],
      };
    }
    case 'matching': {
      const matchMap = answer as Record<string, string>;
      const allCorrect = question.pairs.every(p => matchMap[p.left] === p.right);
      return {
        correct: allCorrect,
        correctAnswer: question.pairs.map(p => `${p.left} = ${p.right}`).join(', '),
      };
    }
  }
}

const QuizSession: React.FC = () => {
  const { state, cloudConfig, loadCloudQuiz, isLoading, t, language } = useAppStore();
  const quiz = state.quizzes[0] as QuizData | undefined;

  const [phase, setPhase] = useState<SessionPhase>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showResult, setShowResult] = useState<{ correct: boolean; correctAnswer: string } | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (cloudConfig.id && cloudConfig.token) {
      loadCloudQuiz();
    }
  }, [cloudConfig.id, cloudConfig.token]);

  const startQuiz = () => {
    if (!quiz) return;
    const qs = quiz.settings.shuffleQuestions ? shuffleArray(quiz.questions) : [...quiz.questions];
    setQuestions(qs);
    setCurrentIndex(0);
    setResults([]);
    setShowResult(null);
    setAnswered(false);
    setTimerKey(0);
    setPhase('quiz');
  };

  const handleAnswer = useCallback((answer: string | number | boolean | Record<string, string>) => {
    if (answered || !quiz) return;
    setAnswered(true);

    const currentQ = questions[currentIndex];
    const result = checkAnswer(currentQ, answer);

    const qResult: QuestionResult = {
      questionId: currentQ.id,
      correct: result.correct,
      studentAnswer: answer,
    };
    setResults(prev => [...prev, qResult]);

    if (quiz.settings.showCorrectAfterEach) {
      setShowResult(result);
    } else {
      // Auto-advance after short delay
      setTimeout(() => advanceQuestion(), 500);
    }
  }, [answered, quiz, questions, currentIndex]);

  const handleTimeUp = useCallback(() => {
    if (answered) return;
    setAnswered(true);

    const currentQ = questions[currentIndex];
    const qResult: QuestionResult = {
      questionId: currentQ.id,
      correct: false,
      studentAnswer: '',
    };
    setResults(prev => [...prev, qResult]);

    if (quiz?.settings.showCorrectAfterEach) {
      const result = checkAnswer(currentQ, '');
      setShowResult({ correct: false, correctAnswer: result.correctAnswer });
    } else {
      setTimeout(() => advanceQuestion(), 500);
    }
  }, [answered, questions, currentIndex, quiz]);

  const advanceQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('results');
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setShowResult(null);
    setAnswered(false);
    setTimerKey(prev => prev + 1);
  };

  const handleSkip = () => {
    if (answered) return;
    const currentQ = questions[currentIndex];
    const qResult: QuestionResult = {
      questionId: currentQ.id,
      correct: false,
      studentAnswer: '',
    };
    setResults(prev => [...prev, qResult]);
    advanceQuestion();
  };

  // Confetti effect
  useEffect(() => {
    if (phase !== 'results') return;
    const score = results.filter(r => r.correct).length;
    const total = results.length;
    if (total === 0) return;
    const pct = (score / total) * 100;

    if (pct >= 70) {
      setShowConfetti(true);
      // Play celebration sound
      try {
        const ctx = new AudioContext();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
      } catch {}

      // Canvas confetti
      const canvas = confettiRef.current;
      if (!canvas) return;
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles: Array<{
        x: number; y: number; vx: number; vy: number;
        size: number; color: string; alpha: number;
        rotation: number; rotSpeed: number;
      }> = [];

      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 3 + 2,
          size: Math.random() * 8 + 4,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2,
        });
      }

      let frame = 0;
      const animate = () => {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.rotation += p.rotSpeed;
          if (frame > 60) p.alpha -= 0.01;

          ctx2d.save();
          ctx2d.translate(p.x, p.y);
          ctx2d.rotate(p.rotation);
          ctx2d.globalAlpha = Math.max(0, p.alpha);
          ctx2d.fillStyle = p.color;
          ctx2d.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx2d.restore();
        });
        frame++;
        if (frame < 180) requestAnimationFrame(animate);
        else {
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          setShowConfetti(false);
        }
      };
      animate();
    }
  }, [phase, results]);

  // Loading state
  if (isLoading && !quiz) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#08b8fb] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!quiz) {
    return <div className="text-center py-20 text-[#6882a9]">{t('loading')}</div>;
  }

  // START SCREEN
  if (phase === 'start') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
        <div className="space-y-4">
          <h1 className={`${TOKENS.typography.display} text-[#091e42]`}>{quiz.title || t('quiz')}</h1>
          {quiz.description && (
            <p className={`${TOKENS.typography.lg} text-[#6882a9] max-w-xl mx-auto`}>{quiz.description}</p>
          )}
        </div>

        <div className="flex items-center gap-6 text-[#6882a9]">
          <div className="flex items-center gap-2">
            <Icons.ListChecks />
            <span className={TOKENS.typography.base}>{quiz.questions.length} {t('questions')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.Clock />
            <span className={TOKENS.typography.base}>
              {quiz.settings.mode === 'timed'
                ? `${t('timedMode')} - ${quiz.settings.timePerQuestion}s ${t('perQuestion')}`
                : t('selfPacedMode')}
            </span>
          </div>
        </div>

        {quiz.questions.length === 0 ? (
          <p className={`${TOKENS.typography.lg} text-[#ef4444]`}>{t('noQuestions')}</p>
        ) : (
          <Button variant="primary" size="xl" onClick={startQuiz}>
            <Icons.Play /> <span className="ml-3">{t('startQuiz')}</span>
          </Button>
        )}
      </div>
    );
  }

  // QUIZ LOOP
  if (phase === 'quiz') {
    const currentQ = questions[currentIndex];
    const progress = ((currentIndex) / questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className={`${TOKENS.typography.sm} text-[#6882a9]`}>
              {t('question')} {currentIndex + 1} {t('questionOf')} {questions.length}
            </span>
            <span className={`${TOKENS.typography.xs} px-3 py-1 rounded-full ${
              currentQ.type === 'mcq' ? 'bg-[#ed3b91]/10 text-[#ed3b91]' :
              currentQ.type === 'true_false' ? 'bg-[#08b8fb]/10 text-[#08b8fb]' :
              currentQ.type === 'fill_blank' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
              'bg-[#a855f7]/10 text-[#a855f7]'
            }`}>
              {currentQ.type === 'mcq' ? t('mcq') :
               currentQ.type === 'true_false' ? t('trueFalse') :
               currentQ.type === 'fill_blank' ? t('fillBlank') :
               t('matching')}
            </span>
          </div>
          <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ed3b91] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        {quiz.settings.mode === 'timed' && (
          <TimerBar
            duration={quiz.settings.timePerQuestion}
            onTimeUp={handleTimeUp}
            isActive={!answered}
            resetKey={timerKey}
          />
        )}

        {/* Question */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8">
          <QuizQuestion
            question={currentQ}
            onAnswer={handleAnswer}
            showResult={showResult}
            disabled={answered}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          {!answered && quiz.settings.mode === 'self_paced' && (
            <Button variant="ghost" size="md" onClick={handleSkip}>
              {t('skipQuestion')}
            </Button>
          )}
          {!answered && quiz.settings.mode !== 'self_paced' && <div />}
          {answered && showResult && (
            <div className="flex items-center gap-3">
              {showResult.correct ? (
                <span className="flex items-center gap-2 text-[#22c55e] font-bold">
                  <Icons.CircleCheck /> {t('correct')}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-[#ef4444] font-bold">
                  <Icons.CircleX /> {t('incorrect')}
                </span>
              )}
            </div>
          )}
          {answered && (
            <Button variant="primary" size="md" onClick={advanceQuestion}>
              {currentIndex + 1 >= questions.length ? t('results') : t('next')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // RESULTS SCREEN
  if (phase === 'results') {
    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="max-w-3xl mx-auto space-y-8">
        {showConfetti && (
          <canvas
            ref={confettiRef}
            className="fixed inset-0 pointer-events-none z-[9998]"
          />
        )}

        {/* Score Card */}
        <div className="text-center space-y-4 py-8">
          <h1 className={`${TOKENS.typography.display} ${pct >= 70 ? 'text-[#22c55e]' : pct >= 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
            {pct}%
          </h1>
          <h2 className={`${TOKENS.typography.title} text-[#091e42]`}>
            {pct >= 70 ? t('congratulations') : t('keepPracticing')}
          </h2>
          <p className={`${TOKENS.typography.lg} text-[#6882a9]`}>
            {pct >= 80 ? t('excellentScore') : pct >= 40 ? t('goodScore') : t('lowScore')}
          </p>

          <div className="flex justify-center gap-8 mt-6">
            <div className="text-center">
              <div className={`${TOKENS.typography.title} text-[#22c55e]`}>{correctCount}</div>
              <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('correct')}</div>
            </div>
            <div className="text-center">
              <div className={`${TOKENS.typography.title} text-[#ef4444]`}>{total - correctCount}</div>
              <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('incorrect')}</div>
            </div>
            <div className="text-center">
              <div className={`${TOKENS.typography.title} text-[#091e42]`}>{total}</div>
              <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('questions')}</div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-8">
            <Button variant="primary" size="lg" onClick={startQuiz}>
              <Icons.RotateCcw /> <span className="ml-2">{t('retake')}</span>
            </Button>
          </div>
        </div>

        {/* Per-Question Review */}
        <div className="space-y-4">
          <h3 className={`${TOKENS.typography.xl} text-[#091e42]`}>{t('review')}</h3>
          {questions.map((q, i) => {
            const result = results[i];
            if (!result) return null;
            const checkResult = checkAnswer(q, result.studentAnswer);

            return (
              <div
                key={q.id}
                className={`p-5 border rounded-xl ${result.correct ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-[#ef4444]/30 bg-[#ef4444]/5'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 ${result.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {result.correct ? <Icons.CircleCheck /> : <Icons.CircleX />}
                  </span>
                  <div className="flex-1">
                    <p className={`${TOKENS.typography.base} font-medium text-[#091e42]`}>{q.question}</p>
                    {result.studentAnswer !== '' && (
                      <p className={`${TOKENS.typography.sm} mt-1 ${result.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                        {t('yourAnswer')}: {
                          typeof result.studentAnswer === 'object'
                            ? Object.entries(result.studentAnswer).map(([k, v]) => `${k} = ${v}`).join(', ')
                            : q.type === 'mcq'
                            ? (q as any).options[result.studentAnswer as number]
                            : q.type === 'true_false'
                            ? (result.studentAnswer ? t('true') : t('false'))
                            : String(result.studentAnswer)
                        }
                      </p>
                    )}
                    {!result.correct && (
                      <p className={`${TOKENS.typography.sm} mt-1 text-[#22c55e]`}>
                        {t('correctAnswerIs')}: {checkResult.correctAnswer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default QuizSession;
