import React, { useState, useEffect, useMemo } from 'react';
import { Question, MCQQuestion, TrueFalseQuestion, FillBlankQuestion, MatchingQuestion, MultiSelectQuestion } from '../types';
import { useAppStore } from '../store';
import { TOKENS, Icons } from '../constants';
import { MathText } from './MathText';

interface QuizQuestionProps {
  question: Question;
  onAnswer: (answer: string | number | boolean | number[] | Record<string, string>) => void;
  showResult?: { correct: boolean; correctAnswer: string } | null;
  disabled?: boolean;
  /** Called when the student requests a hint. Should return the hint text. */
  onHintRequested?: () => Promise<string>;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({ question, onAnswer, showResult, disabled, onHintRequested }) => {
  const { t } = useAppStore();
  const [selectedMCQ, setSelectedMCQ] = useState<number | null>(null);
  const [selectedTF, setSelectedTF] = useState<boolean | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [matchAnswers, setMatchAnswers] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<number[]>([]);
  const [multiSubmitted, setMultiSubmitted] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedMCQ(null);
    setSelectedTF(null);
    setFillAnswer('');
    setMatchAnswers({});
    setSelectedLeft(null);
    setSelectedMulti([]);
    setMultiSubmitted(false);
    setHintText(null);
    setLoadingHint(false);
  }, [question.id]);

  const handleHintClick = async () => {
    if (!onHintRequested || hintText || loadingHint) return;
    setLoadingHint(true);
    try {
      const hint = await onHintRequested();
      setHintText(hint || '');
    } catch {
      setHintText(t('aiError'));
    } finally {
      setLoadingHint(false);
    }
  };

  // Shuffled MCQ option indices (e.g. [2,0,3,1] means display slot 0 shows original option 2)
  const shuffledMCQIndices = useMemo(() => {
    if (question.type !== 'mcq') return [];
    const indices = question.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [question.id]);

  // Shuffled multi-select option indices
  const shuffledMultiIndices = useMemo(() => {
    if (question.type !== 'multi_select') return [];
    const indices = question.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [question.id]);

  // Shuffled left items for matching
  const shuffledLeftItems = useMemo(() => {
    if (question.type !== 'matching') return [];
    const lefts = question.pairs.map(p => p.left);
    for (let i = lefts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lefts[i], lefts[j]] = [lefts[j], lefts[i]];
    }
    return lefts;
  }, [question.id]);

  // Shuffled right items for matching
  const shuffledRightOptions = useMemo(() => {
    if (question.type !== 'matching') return [];
    const rights = question.pairs.map(p => p.right);
    for (let i = rights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rights[i], rights[j]] = [rights[j], rights[i]];
    }
    return rights;
  }, [question.id]);

  // Lookup: left text -> correct right text (for matching result highlighting)
  const correctMatchMap = useMemo(() => {
    if (question.type !== 'matching') return {} as Record<string, string>;
    const map: Record<string, string> = {};
    question.pairs.forEach(p => { map[p.left] = p.right; });
    return map;
  }, [question.id]);

  const renderMCQ = (q: MCQQuestion) => (
    <div className="space-y-3">
      {shuffledMCQIndices.map((origIdx, displayIdx) => {
        const opt = q.options[origIdx];
        let bgClass = 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f8fafc]';
        if (selectedMCQ === origIdx) {
          bgClass = 'bg-[#08b8fb]/10 border-[#08b8fb] ring-1 ring-[#08b8fb]';
        }
        if (showResult && selectedMCQ === origIdx) {
          bgClass = showResult.correct
            ? 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]'
            : 'bg-[#ef4444]/10 border-[#ef4444] ring-1 ring-[#ef4444]';
        }
        if (showResult && !showResult.correct && origIdx === q.correctIndex) {
          bgClass = 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]';
        }

        return (
          <button
            key={origIdx}
            onClick={() => {
              if (disabled) return;
              setSelectedMCQ(origIdx);
              onAnswer(origIdx);
            }}
            disabled={disabled}
            className={`w-full text-start px-3 sm:px-5 py-3 sm:py-4 border rounded-xl transition-all min-h-[52px] ${bgClass} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold shrink-0">
                {String.fromCharCode(65 + displayIdx)}
              </span>
              <span className={TOKENS.typography.base}><MathText>{opt}</MathText></span>
              {showResult && origIdx === q.correctIndex && (
                <span className="ml-auto text-[#22c55e]"><Icons.CircleCheck /></span>
              )}
              {showResult && selectedMCQ === origIdx && !showResult.correct && (
                <span className="ml-auto text-[#ef4444]"><Icons.CircleX /></span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderTrueFalse = (q: TrueFalseQuestion) => (
    <div className="flex gap-3 sm:gap-4">
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
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          dir="auto"
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
          {t('correctAnswerIs')}: <MathText>{showResult.correctAnswer}</MathText>
        </p>
      )}
    </div>
  );

  const renderMatching = (q: MatchingQuestion) => {
    const matchedCount = Object.keys(matchAnswers).length;
    const allMatched = matchedCount === q.pairs.length;

    return (
      <div className="space-y-4">
        <p className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('matchInstructionV2')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Items column (shuffled left) */}
          <div className="space-y-3 p-3 sm:p-0 bg-[#fdf2f8] sm:bg-transparent rounded-xl border-2 border-dashed border-[#ed3b91]/30 sm:border-0 sm:border-none">
            <div className="flex items-center gap-2 sm:hidden mb-1">
              <span className="w-6 h-6 rounded-full bg-[#ed3b91] text-white text-[0.7rem] font-bold flex items-center justify-center">1</span>
              <span className={`${TOKENS.typography.xs} font-bold text-[#ed3b91]`}>{t('matchTapItem')}</span>
            </div>
            {shuffledLeftItems.map((leftText, i) => {
              const isMatched = matchAnswers[leftText] !== undefined;
              const isSelected = selectedLeft === leftText;
              let bgClass = 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1]';
              if (isSelected) bgClass = 'bg-[#ed3b91]/10 border-[#ed3b91] ring-1 ring-[#ed3b91]';
              if (isMatched) bgClass = 'bg-[#08b8fb]/10 border-[#08b8fb]';

              if (showResult && isMatched) {
                const isCorrect = matchAnswers[leftText] === correctMatchMap[leftText];
                bgClass = isCorrect
                  ? 'bg-[#22c55e]/10 border-[#22c55e]'
                  : 'bg-[#ef4444]/10 border-[#ef4444]';
              }

              return (
                <button
                  key={`left-${i}`}
                  onClick={() => {
                    if (disabled || isMatched) return;
                    setSelectedLeft(leftText);
                  }}
                  disabled={disabled || isMatched}
                  className={`w-full text-start px-4 py-3 border rounded-xl transition-all ${bgClass} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={TOKENS.typography.base}><MathText>{leftText}</MathText></span>
                  {isMatched && (
                    <span className={`${TOKENS.typography.sm} ml-2 text-[#08b8fb]`}>
                      &rarr; <MathText>{matchAnswers[leftText]}</MathText>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Match-with column (shuffled right) */}
          <div className="space-y-3 p-3 sm:p-0 bg-[#eff6ff] sm:bg-transparent rounded-xl border-2 border-dashed border-[#08b8fb]/30 sm:border-0 sm:border-none">
            <div className="flex items-center gap-2 sm:hidden mb-1">
              <span className="w-6 h-6 rounded-full bg-[#08b8fb] text-white text-[0.7rem] font-bold flex items-center justify-center">2</span>
              <span className={`${TOKENS.typography.xs} font-bold text-[#08b8fb]`}>{t('matchTapPair')}</span>
            </div>
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
                  <span className={TOKENS.typography.base}><MathText>{right}</MathText></span>
                </button>
              );
            })}
          </div>
        </div>
        {!allMatched && !disabled && selectedLeft && (
          <p className={`${TOKENS.typography.sm} text-[#ed3b91] text-center`}>
            Now select a match for: <strong><MathText>{selectedLeft}</MathText></strong>
          </p>
        )}
      </div>
    );
  };

  const renderMultiSelect = (q: MultiSelectQuestion) => {
    const sortedCorrect = [...q.correctIndices].sort((a, b) => a - b);

    return (
      <div className="space-y-4">
        <p className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('selectAllCorrect')}</p>
        <div className="space-y-3">
          {shuffledMultiIndices.map((origIdx, displayIdx) => {
            const opt = q.options[origIdx];
            const isSelected = selectedMulti.includes(origIdx);
            const isCorrectOption = q.correctIndices.includes(origIdx);

            let bgClass = 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f8fafc]';
            if (isSelected && !multiSubmitted) {
              bgClass = 'bg-[#14b8a6]/10 border-[#14b8a6] ring-1 ring-[#14b8a6]';
            }
            if (multiSubmitted && showResult) {
              if (isSelected && isCorrectOption) {
                bgClass = 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]';
              } else if (isSelected && !isCorrectOption) {
                bgClass = 'bg-[#ef4444]/10 border-[#ef4444] ring-1 ring-[#ef4444]';
              } else if (!isSelected && isCorrectOption && !showResult.correct) {
                bgClass = 'bg-[#22c55e]/10 border-[#22c55e] ring-1 ring-[#22c55e]';
              }
            }

            return (
              <button
                key={origIdx}
                onClick={() => {
                  if (disabled || multiSubmitted) return;
                  setSelectedMulti(prev =>
                    prev.includes(origIdx)
                      ? prev.filter(i => i !== origIdx)
                      : [...prev, origIdx]
                  );
                }}
                disabled={disabled || multiSubmitted}
                className={`w-full text-start px-3 sm:px-5 py-3 sm:py-4 border rounded-xl transition-all min-h-[52px] ${bgClass} ${disabled || multiSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'border-[#14b8a6] bg-[#14b8a6] text-white' : 'border-[#cbd5e1]'
                  }`}>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </span>
                  <span className={TOKENS.typography.base}><MathText>{opt}</MathText></span>
                  {multiSubmitted && showResult && isCorrectOption && (
                    <span className="ml-auto text-[#22c55e]"><Icons.CircleCheck /></span>
                  )}
                  {multiSubmitted && showResult && isSelected && !isCorrectOption && (
                    <span className="ml-auto text-[#ef4444]"><Icons.CircleX /></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {!multiSubmitted && !disabled && (
          <button
            onClick={() => {
              if (selectedMulti.length === 0) return;
              setMultiSubmitted(true);
              const sortedSelected = [...selectedMulti].sort((a, b) => a - b);
              onAnswer(sortedSelected);
            }}
            disabled={selectedMulti.length === 0}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${
              selectedMulti.length > 0
                ? 'bg-[#14b8a6] text-white hover:bg-[#0d9488]'
                : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
            }`}
          >
            {t('submit')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className={`${TOKENS.typography.xl} text-[#091e42] flex-1`}><MathText block>{question.question}</MathText></h2>
        {onHintRequested && !showResult && !disabled && (
          <button
            onClick={handleHintClick}
            disabled={!!hintText || loadingHint}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f59e0b]/10 text-[#d97706] text-[0.8rem] font-semibold hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-50"
            title={t('hintCost')}
          >
            {loadingHint ? (
              <>
                <div className="w-3 h-3 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin"></div>
                {t('loading')}
              </>
            ) : (
              <>💡 {hintText ? t('hintShown') : t('showHint')}</>
            )}
          </button>
        )}
      </div>
      {hintText && (
        <div className="px-4 py-3 bg-[#fef9c3] border-l-4 border-[#f59e0b] rounded">
          <div className={`${TOKENS.typography.xs} font-bold text-[#d97706] mb-1 uppercase tracking-wider`}>{t('hint')}</div>
          <div className={`${TOKENS.typography.base} text-[#92400e]`}><MathText>{hintText}</MathText></div>
        </div>
      )}
      {question.type === 'mcq' && renderMCQ(question)}
      {question.type === 'true_false' && renderTrueFalse(question)}
      {question.type === 'fill_blank' && renderFillBlank(question)}
      {question.type === 'matching' && renderMatching(question)}
      {question.type === 'multi_select' && renderMultiSelect(question)}
    </div>
  );
};
