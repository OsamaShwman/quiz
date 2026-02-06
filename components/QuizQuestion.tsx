import React, { useState, useEffect, useMemo } from 'react';
import { Question, MCQQuestion, TrueFalseQuestion, FillBlankQuestion, MatchingQuestion } from '../types';
import { useAppStore } from '../store';
import { TOKENS, Icons } from '../constants';

interface QuizQuestionProps {
  question: Question;
  onAnswer: (answer: string | number | boolean | Record<string, string>) => void;
  showResult?: { correct: boolean; correctAnswer: string } | null;
  disabled?: boolean;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({ question, onAnswer, showResult, disabled }) => {
  const { t } = useAppStore();
  const [selectedMCQ, setSelectedMCQ] = useState<number | null>(null);
  const [selectedTF, setSelectedTF] = useState<boolean | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [matchAnswers, setMatchAnswers] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Reset state when question changes
  useEffect(() => {
    setSelectedMCQ(null);
    setSelectedTF(null);
    setFillAnswer('');
    setMatchAnswers({});
    setSelectedLeft(null);
  }, [question.id]);

  // Shuffled right options for matching
  const shuffledRightOptions = useMemo(() => {
    if (question.type !== 'matching') return [];
    const rights = question.pairs.map(p => p.right);
    for (let i = rights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rights[i], rights[j]] = [rights[j], rights[i]];
    }
    return rights;
  }, [question.id]);

  const renderMCQ = (q: MCQQuestion) => (
    <div className="space-y-3">
      {q.options.map((opt, i) => {
        let bgClass = 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f8fafc]';
        if (selectedMCQ === i) {
          bgClass = 'bg-[#08b8fb]/10 border-[#08b8fb] ring-1 ring-[#08b8fb]';
        }
        if (showResult && selectedMCQ === i) {
          bgClass = showResult.correct
            ? 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]'
            : 'bg-[#ef4444]/10 border-[#ef4444] ring-1 ring-[#ef4444]';
        }
        if (showResult && !showResult.correct && i === q.correctIndex) {
          bgClass = 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]';
        }

        return (
          <button
            key={i}
            onClick={() => {
              if (disabled) return;
              setSelectedMCQ(i);
              onAnswer(i);
            }}
            disabled={disabled}
            className={`w-full text-start px-5 py-4 border rounded-xl transition-all ${bgClass} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className={TOKENS.typography.base}>{opt}</span>
              {showResult && i === q.correctIndex && (
                <span className="ml-auto text-[#22c55e]"><Icons.CircleCheck /></span>
              )}
              {showResult && selectedMCQ === i && !showResult.correct && (
                <span className="ml-auto text-[#ef4444]"><Icons.CircleX /></span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderTrueFalse = (q: TrueFalseQuestion) => (
    <div className="flex gap-4">
      {[true, false].map(val => {
        let bgClass = 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f8fafc]';
        if (selectedTF === val) {
          bgClass = 'bg-[#08b8fb]/10 border-[#08b8fb] ring-1 ring-[#08b8fb]';
        }
        if (showResult && selectedTF === val) {
          bgClass = showResult.correct
            ? 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]'
            : 'bg-[#ef4444]/10 border-[#ef4444] ring-1 ring-[#ef4444]';
        }
        if (showResult && !showResult.correct && val === q.correctAnswer) {
          bgClass = 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]';
        }

        return (
          <button
            key={String(val)}
            onClick={() => {
              if (disabled) return;
              setSelectedTF(val);
              onAnswer(val);
            }}
            disabled={disabled}
            className={`flex-1 px-6 py-5 border rounded-xl transition-all text-center ${bgClass} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className={`${TOKENS.typography.xl} ${val ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {val ? t('true') : t('false')}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderFillBlank = (q: FillBlankQuestion) => (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={fillAnswer}
          onChange={e => setFillAnswer(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && fillAnswer.trim() && !disabled) {
              onAnswer(fillAnswer.trim());
            }
          }}
          placeholder={t('typeAnswer')}
          disabled={disabled}
          className={`flex-1 px-4 py-3 border rounded-xl ${TOKENS.typography.base} text-[#091e42] placeholder-[#6882a9] focus:ring-2 focus:ring-[#08b8fb] focus:outline-none ${
            showResult
              ? showResult.correct
                ? 'border-[#22c55e] bg-[#22c55e]/5'
                : 'border-[#ef4444] bg-[#ef4444]/5'
              : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
          }`}
        />
        {!disabled && (
          <button
            onClick={() => {
              if (fillAnswer.trim()) onAnswer(fillAnswer.trim());
            }}
            className="px-6 py-3 bg-[#08b8fb] text-white rounded-xl font-bold hover:bg-[#07a2dd] transition-colors"
          >
            {t('submit')}
          </button>
        )}
      </div>
      {showResult && !showResult.correct && (
        <p className={`${TOKENS.typography.sm} text-[#22c55e]`}>
          {t('correctAnswerIs')}: {showResult.correctAnswer}
        </p>
      )}
    </div>
  );

  const renderMatching = (q: MatchingQuestion) => {
    const matchedCount = Object.keys(matchAnswers).length;
    const allMatched = matchedCount === q.pairs.length;

    return (
      <div className="space-y-4">
        <p className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('matchInstruction')}</p>
        <div className="grid grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-3">
            {q.pairs.map((pair, i) => {
              const isMatched = matchAnswers[pair.left] !== undefined;
              const isSelected = selectedLeft === pair.left;
              let bgClass = 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1]';
              if (isSelected) bgClass = 'bg-[#ed3b91]/10 border-[#ed3b91] ring-1 ring-[#ed3b91]';
              if (isMatched) bgClass = 'bg-[#08b8fb]/10 border-[#08b8fb]';

              if (showResult && isMatched) {
                const isCorrect = matchAnswers[pair.left] === pair.right;
                bgClass = isCorrect
                  ? 'bg-[#22c55e]/10 border-[#22c55e]'
                  : 'bg-[#ef4444]/10 border-[#ef4444]';
              }

              return (
                <button
                  key={`left-${i}`}
                  onClick={() => {
                    if (disabled || isMatched) return;
                    setSelectedLeft(pair.left);
                  }}
                  disabled={disabled || isMatched}
                  className={`w-full text-start px-4 py-3 border rounded-xl transition-all ${bgClass} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={TOKENS.typography.base}>{pair.left}</span>
                  {isMatched && (
                    <span className={`${TOKENS.typography.sm} ml-2 text-[#08b8fb]`}>
                      &rarr; {matchAnswers[pair.left]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right column */}
          <div className="space-y-3">
            {shuffledRightOptions.map((right, i) => {
              const isUsed = Object.values(matchAnswers).includes(right);
              let bgClass = 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1]';
              if (isUsed) bgClass = 'bg-[#f8fafc] border-[#e2e8f0] opacity-50';

              return (
                <button
                  key={`right-${i}`}
                  onClick={() => {
                    if (disabled || isUsed || !selectedLeft) return;
                    const newMatch = { ...matchAnswers, [selectedLeft]: right };
                    setMatchAnswers(newMatch);
                    setSelectedLeft(null);

                    if (Object.keys(newMatch).length === q.pairs.length) {
                      onAnswer(newMatch);
                    }
                  }}
                  disabled={disabled || isUsed || !selectedLeft}
                  className={`w-full text-start px-4 py-3 border rounded-xl transition-all ${bgClass} ${disabled || isUsed || !selectedLeft ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={TOKENS.typography.base}>{right}</span>
                </button>
              );
            })}
          </div>
        </div>
        {!allMatched && !disabled && selectedLeft && (
          <p className={`${TOKENS.typography.sm} text-[#ed3b91] text-center`}>
            Now select a match for: <strong>{selectedLeft}</strong>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className={`${TOKENS.typography.xl} text-[#091e42]`}>{question.question}</h2>
      {question.type === 'mcq' && renderMCQ(question)}
      {question.type === 'true_false' && renderTrueFalse(question)}
      {question.type === 'fill_blank' && renderFillBlank(question)}
      {question.type === 'matching' && renderMatching(question)}
    </div>
  );
};
