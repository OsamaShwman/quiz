import React, { useState } from 'react';
import { Question, QuestionType, MCQQuestion, TrueFalseQuestion, FillBlankQuestion, MatchingQuestion, MultiSelectQuestion } from '../types';
import { useAppStore } from '../store';
import { Button } from './Button';
import { Icons, TOKENS, FOCUS_RING } from '../constants';
import { improveQuestion, ImproveAction } from '../aiService';
import { MathText } from './MathText';

// Returns true if the text contains math markers (current $$...$$ or
// legacy/corrupted patterns) so we can show a teacher preview.
function hasMath(text: string | undefined): boolean {
  if (!text) return false;
  return /\$\$|\\\(|\\\[|ext\{|ightarrow|rac\{/.test(text);
}

// Small rendered preview shown beneath an editor input whenever its text
// contains math, so the teacher sees how the LaTeX will look to students
// instead of the raw $$...$$ source.
const MathPreview: React.FC<{ text: string | undefined }> = ({ text }) => {
  if (!hasMath(text)) return null;
  return (
    <div className="mt-1.5 px-2.5 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[0.85rem] text-[#475569]">
      <MathText>{text}</MathText>
    </div>
  );
};

interface QuestionCardProps {
  question: Question;
  index: number;
  onChange: (updated: Question) => void;
  onRemove: () => void;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: 'bg-[#22c55e]/10', text: 'text-[#16a34a]', label: 'Easy' },
  medium: { bg: 'bg-[#f59e0b]/10', text: 'text-[#d97706]', label: 'Medium' },
  hard: { bg: 'bg-[#ef4444]/10', text: 'text-[#dc2626]', label: 'Hard' },
  super_hard: { bg: 'bg-[#7c3aed]/10', text: 'text-[#6d28d9]', label: 'Super Hard' },
};

const TYPE_THEME = {
  mcq: { color: '#ed3b91', bg: 'bg-[#ed3b91]', bgLight: 'bg-[#ed3b91]/5', border: 'border-[#ed3b91]', text: 'text-[#ed3b91]', accent: '#ed3b91', label: 'MCQ' },
  true_false: { color: '#08b8fb', bg: 'bg-[#08b8fb]', bgLight: 'bg-[#08b8fb]/5', border: 'border-[#08b8fb]', text: 'text-[#08b8fb]', accent: '#08b8fb', label: 'T/F' },
  fill_blank: { color: '#f59e0b', bg: 'bg-[#f59e0b]', bgLight: 'bg-[#f59e0b]/5', border: 'border-[#f59e0b]', text: 'text-[#f59e0b]', accent: '#f59e0b', label: 'Fill' },
  matching: { color: '#a855f7', bg: 'bg-[#a855f7]', bgLight: 'bg-[#a855f7]/5', border: 'border-[#a855f7]', text: 'text-[#a855f7]', accent: '#a855f7', label: 'Match' },
  multi_select: { color: '#14b8a6', bg: 'bg-[#14b8a6]', bgLight: 'bg-[#14b8a6]/5', border: 'border-[#14b8a6]', text: 'text-[#14b8a6]', accent: '#14b8a6', label: 'Multi' },
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const inputBase = `w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-[0.9rem] text-[#091e42] placeholder-[#b0bec5] transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:outline-none hover:border-[#cbd5e1] bg-white`;

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, index, onChange, onRemove }) => {
  const { t } = useAppStore();
  const theme = TYPE_THEME[question.type];
  const [improveOpen, setImproveOpen] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [showCitation, setShowCitation] = useState(false);

  const handleImprove = async (action: ImproveAction) => {
    setImproveOpen(false);
    setIsImproving(true);
    try {
      const improved = await improveQuestion(question, action);
      if (improved) onChange(improved);
    } catch {
      alert(t('aiError'));
    } finally {
      setIsImproving(false);
    }
  };

  const difficultyMeta = question.difficulty ? DIFFICULTY_COLORS[question.difficulty] : null;

  const handleTypeChange = (newType: QuestionType) => {
    const base = { id: question.id, question: question.question };
    switch (newType) {
      case 'mcq':
        onChange({ ...base, type: 'mcq', options: ['', '', '', ''], correctIndex: 0 });
        break;
      case 'true_false':
        onChange({ ...base, type: 'true_false', correctAnswer: true });
        break;
      case 'fill_blank':
        onChange({ ...base, type: 'fill_blank', acceptedAnswers: [''], caseSensitive: false });
        break;
      case 'matching':
        onChange({ ...base, type: 'matching', pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }] });
        break;
      case 'multi_select':
        onChange({ ...base, type: 'multi_select', options: ['', '', '', ''], correctIndices: [] });
        break;
    }
  };

  const typeButtons: { type: QuestionType; key: keyof typeof TYPE_THEME }[] = [
    { type: 'mcq', key: 'mcq' },
    { type: 'true_false', key: 'true_false' },
    { type: 'fill_blank', key: 'fill_blank' },
    { type: 'matching', key: 'matching' },
    { type: 'multi_select', key: 'multi_select' },
  ];

  const renderMCQEditor = (q: MCQQuestion) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {q.options.map((opt, i) => {
        const isCorrect = q.correctIndex === i;
        return (
          <div
            key={i}
            onClick={() => onChange({ ...q, correctIndex: i as 0 | 1 | 2 | 3 })}
            className={`group relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              isCorrect
                ? 'border-[#22c55e] bg-[#22c55e]/5 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]'
                : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Letter badge */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200 ${
                isCorrect
                  ? 'bg-[#22c55e] text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]'
                  : 'bg-[#f1f5f9] text-[#6882a9] group-hover:bg-[#e2e8f0]'
              }`}>
                {OPTION_LETTERS[i]}
              </div>
              <input
                type="text"
                dir="auto"
                value={opt}
                onClick={e => e.stopPropagation()}
                onChange={e => {
                  const newOptions = [...q.options] as [string, string, string, string];
                  newOptions[i] = e.target.value;
                  onChange({ ...q, options: newOptions });
                }}
                placeholder={`${t('option')} ${i + 1}`}
                className="flex-1 bg-transparent border-none outline-none text-[0.9rem] text-[#091e42] placeholder-[#b0bec5]"
              />
              {/* Checkmark */}
              {isCorrect && (
                <div className="text-[#22c55e] shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>
            <MathPreview text={opt} />
          </div>
        );
      })}
    </div>
  );

  const renderTrueFalseEditor = (q: TrueFalseQuestion) => (
    <div className="grid grid-cols-2 gap-4">
      {[true, false].map(val => {
        const isSelected = q.correctAnswer === val;
        const isTrue = val === true;
        return (
          <button
            key={String(val)}
            onClick={() => onChange({ ...q, correctAnswer: val })}
            className={`relative flex flex-col items-center justify-center py-8 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
              isSelected
                ? isTrue
                  ? 'border-[#22c55e] bg-gradient-to-b from-[#22c55e]/5 to-[#22c55e]/10 shadow-[0_4px_20px_rgba(34,197,94,0.15)]'
                  : 'border-[#ef4444] bg-gradient-to-b from-[#ef4444]/5 to-[#ef4444]/10 shadow-[0_4px_20px_rgba(239,68,68,0.15)]'
                : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:shadow-sm'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-200 ${
              isSelected
                ? isTrue
                  ? 'bg-[#22c55e] text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)]'
                  : 'bg-[#ef4444] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]'
                : 'bg-[#f1f5f9] text-[#94a3b8]'
            }`}>
              {isTrue ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
            </div>
            <span className={`text-[1.1rem] font-bold ${
              isSelected
                ? isTrue ? 'text-[#22c55e]' : 'text-[#ef4444]'
                : 'text-[#6882a9]'
            }`}>
              {isTrue ? t('true') : t('false')}
            </span>
            {isSelected && (
              <div className={`absolute top-3 end-3 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${isTrue ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderFillBlankEditor = (q: FillBlankQuestion) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded bg-[#f59e0b]/10 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12h16"/></svg>
        </div>
        <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-[#f59e0b]">{t('acceptedAnswers')}</span>
      </div>
      {q.acceptedAnswers.map((ans, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute start-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#f59e0b]/10 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <input
                type="text"
                dir="auto"
                value={ans}
                onChange={e => {
                  const newAnswers = [...q.acceptedAnswers];
                  newAnswers[i] = e.target.value;
                  onChange({ ...q, acceptedAnswers: newAnswers });
                }}
                placeholder={`${t('correctAnswer')} ${i + 1}`}
                className={`${inputBase} ps-12 focus:ring-[#f59e0b]`}
              />
            </div>
            {q.acceptedAnswers.length > 1 && (
              <button
                onClick={() => {
                  const newAnswers = q.acceptedAnswers.filter((_, idx) => idx !== i);
                  onChange({ ...q, acceptedAnswers: newAnswers });
                }}
                className="w-10 h-10 rounded-xl border border-[#fecaca] bg-[#fef2f2] text-[#ef4444] hover:bg-[#fee2e2] flex items-center justify-center transition-colors shrink-0"
              >
                <Icons.Trash />
              </button>
            )}
          </div>
          <MathPreview text={ans} />
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => onChange({ ...q, acceptedAnswers: [...q.acceptedAnswers, ''] })}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#f59e0b] hover:bg-[#f59e0b]/5 transition-colors text-sm font-medium"
        >
          <Icons.Plus /> {t('addAnswer')}
        </button>
        <label className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-xl hover:bg-[#f8fafc] transition-colors">
          <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${q.caseSensitive ? 'bg-[#08b8fb]' : 'bg-[#e2e8f0]'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${q.caseSensitive ? 'start-[1.1rem]' : 'start-0.5'}`} />
            <input type="checkbox" checked={q.caseSensitive} onChange={e => onChange({ ...q, caseSensitive: e.target.checked })} className="sr-only" />
          </div>
          <span className="text-[0.8rem] text-[#6882a9]">{t('caseSensitive')}</span>
        </label>
      </div>
    </div>
  );

  const renderMatchingEditor = (q: MatchingQuestion) => (
    <div className="space-y-3">
      {q.pairs.map((pair, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Left side */}
            <div className="flex-1 relative">
              <div className="absolute start-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#a855f7]/10 flex items-center justify-center text-[0.7rem] font-bold text-[#a855f7]">
                {i + 1}
              </div>
              <input
                type="text"
                dir="auto"
                value={pair.left}
                onChange={e => {
                  const newPairs = [...q.pairs];
                  newPairs[i] = { ...newPairs[i], left: e.target.value };
                  onChange({ ...q, pairs: newPairs });
                }}
                placeholder={t('left')}
                className={`${inputBase} ps-12 focus:ring-[#a855f7]`}
              />
            </div>
            {/* Arrow connector */}
            <div className="w-10 h-10 rounded-xl bg-[#a855f7]/5 border border-[#a855f7]/20 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
            {/* Right side */}
            <div className="flex-1">
              <input
                type="text"
                dir="auto"
                value={pair.right}
                onChange={e => {
                  const newPairs = [...q.pairs];
                  newPairs[i] = { ...newPairs[i], right: e.target.value };
                  onChange({ ...q, pairs: newPairs });
                }}
                placeholder={t('right')}
                className={`${inputBase} focus:ring-[#a855f7]`}
              />
            </div>
            {q.pairs.length > 3 && (
              <button
                onClick={() => {
                  const newPairs = q.pairs.filter((_, idx) => idx !== i);
                  onChange({ ...q, pairs: newPairs });
                }}
                className="w-10 h-10 rounded-xl border border-[#fecaca] bg-[#fef2f2] text-[#ef4444] hover:bg-[#fee2e2] flex items-center justify-center transition-colors shrink-0"
              >
                <Icons.Trash />
              </button>
            )}
          </div>
          {(hasMath(pair.left) || hasMath(pair.right)) && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[0.85rem] text-[#475569]">
              <MathText>{pair.left}</MathText>
              <span className="text-[#a855f7]">&rarr;</span>
              <MathText>{pair.right}</MathText>
            </div>
          )}
        </div>
      ))}
      {q.pairs.length < 6 && (
        <button
          onClick={() => onChange({ ...q, pairs: [...q.pairs, { left: '', right: '' }] })}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#a855f7] hover:bg-[#a855f7]/5 transition-colors text-sm font-medium"
        >
          <Icons.Plus /> {t('addPair')}
        </button>
      )}
    </div>
  );

  const renderMultiSelectEditor = (q: MultiSelectQuestion) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded bg-[#14b8a6]/10 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-[#14b8a6]">{t('selectAllCorrect')}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const isCorrect = q.correctIndices.includes(i);
          return (
            <div
              key={i}
              onClick={() => {
                const newIndices = isCorrect
                  ? q.correctIndices.filter(idx => idx !== i)
                  : [...q.correctIndices, i];
                onChange({ ...q, correctIndices: newIndices });
              }}
              className={`group relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                isCorrect
                  ? 'border-[#22c55e] bg-[#22c55e]/5 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]'
                  : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox badge */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200 ${
                  isCorrect
                    ? 'bg-[#22c55e] text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]'
                    : 'bg-[#f1f5f9] text-[#6882a9] group-hover:bg-[#e2e8f0]'
                }`}>
                  {isCorrect ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    OPTION_LETTERS[i] || String(i + 1)
                  )}
                </div>
                <input
                  type="text"
                  value={opt}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    const newOptions = [...q.options];
                    newOptions[i] = e.target.value;
                    onChange({ ...q, options: newOptions });
                  }}
                  placeholder={`${t('option')} ${i + 1}`}
                  className="flex-1 bg-transparent border-none outline-none text-[0.9rem] text-[#091e42] placeholder-[#b0bec5]"
                />
                {isCorrect && (
                  <div className="text-[#22c55e] shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
              <MathPreview text={opt} />
            </div>
          );
        })}
      </div>
      {/* Add/Remove option buttons */}
      <div className="flex items-center gap-2 pt-1">
        {q.options.length < 6 && (
          <button
            onClick={() => onChange({ ...q, options: [...q.options, ''] })}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#14b8a6] hover:bg-[#14b8a6]/5 transition-colors text-sm font-medium"
          >
            <Icons.Plus /> {t('option')}
          </button>
        )}
        {q.options.length > 2 && (
          <button
            onClick={() => {
              const lastIdx = q.options.length - 1;
              const newOptions = q.options.slice(0, -1);
              const newIndices = q.correctIndices.filter(idx => idx !== lastIdx);
              onChange({ ...q, options: newOptions, correctIndices: newIndices });
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#ef4444] hover:bg-[#ef4444]/5 transition-colors text-sm font-medium"
          >
            <Icons.Trash />
          </button>
        )}
      </div>
    </div>
  );

  const renderEditor = () => {
    switch (question.type) {
      case 'mcq': return renderMCQEditor(question);
      case 'true_false': return renderTrueFalseEditor(question);
      case 'fill_blank': return renderFillBlankEditor(question);
      case 'matching': return renderMatchingEditor(question);
      case 'multi_select': return renderMultiSelectEditor(question);
    }
  };

  return (
    <div
      className="relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group"
      style={{ border: '1px solid #e2e8f0', borderInlineStart: `4px solid ${theme.color}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          {/* Question number */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
            style={{ backgroundColor: theme.color }}
          >
            {index + 1}
          </div>
          {/* Type pill buttons */}
          <div className="flex items-center bg-[#f8fafc] rounded-xl p-1 gap-0.5">
            {typeButtons.map(tb => {
              const tTheme = TYPE_THEME[tb.key];
              const isActive = question.type === tb.type;
              return (
                <button
                  key={tb.type}
                  onClick={() => handleTypeChange(tb.type)}
                  className={`px-3 py-1.5 rounded-lg text-[0.7rem] font-bold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? `text-white shadow-sm`
                      : 'text-[#94a3b8] hover:text-[#64748b] hover:bg-white'
                  }`}
                  style={isActive ? { backgroundColor: tTheme.color } : undefined}
                >
                  {tb.type === 'mcq' ? t('mcq') : tb.type === 'true_false' ? t('trueFalse') : tb.type === 'fill_blank' ? t('fillBlank') : tb.type === 'matching' ? t('matching') : t('multiSelect')}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {difficultyMeta && (
            <span className={`px-2 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider ${difficultyMeta.bg} ${difficultyMeta.text}`}>
              {difficultyMeta.label}
            </span>
          )}
          {/* Improve dropdown */}
          <div className="relative">
            <button
              onClick={() => setImproveOpen(o => !o)}
              disabled={isImproving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-[#08b8fb] bg-[#08b8fb]/5 hover:bg-[#08b8fb]/10 transition-colors disabled:opacity-50"
            >
              {isImproving ? (
                <>
                  <div className="w-3 h-3 border-2 border-[#08b8fb] border-t-transparent rounded-full animate-spin"></div>
                  {t('improving')}
                </>
              ) : (
                <>
                  <Icons.Sparkles /> {t('improveQuestion')}
                </>
              )}
            </button>
            {improveOpen && !isImproving && (
              <div className="absolute end-0 top-full mt-1 z-10 bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 min-w-[160px]">
                <button onClick={() => handleImprove('rephrase')} className="w-full text-start px-3 py-2 text-[0.85rem] text-[#091e42] hover:bg-[#f8fafc]">{t('rephrase')}</button>
                <button onClick={() => handleImprove('fix_grammar')} className="w-full text-start px-3 py-2 text-[0.85rem] text-[#091e42] hover:bg-[#f8fafc]">{t('fixGrammar')}</button>
                <button onClick={() => handleImprove('easier')} className="w-full text-start px-3 py-2 text-[0.85rem] text-[#091e42] hover:bg-[#f8fafc]">{t('makeEasier')}</button>
                <button onClick={() => handleImprove('harder')} className="w-full text-start px-3 py-2 text-[0.85rem] text-[#091e42] hover:bg-[#f8fafc]">{t('makeHarder')}</button>
              </div>
            )}
          </div>
          {/* Delete */}
          <button
            onClick={onRemove}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#cbd5e1] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <Icons.Trash />
          </button>
        </div>
      </div>

      {/* Question input */}
      <div className="px-6 pb-4">
        <input
          type="text"
          dir="auto"
          value={question.question}
          onChange={e => onChange({ ...question, question: e.target.value } as Question)}
          placeholder={t('questionPlaceholder')}
          className="w-full px-0 py-3 border-none border-b-2 border-[#e2e8f0] bg-transparent text-[1.05rem] font-medium text-[#091e42] placeholder-[#b0bec5] focus:outline-none focus:border-b-2 transition-all"
          style={{ borderBottom: `2px solid #e2e8f0`, borderRadius: 0 }}
          onFocus={e => e.target.style.borderBottomColor = theme.color}
          onBlur={e => e.target.style.borderBottomColor = '#e2e8f0'}
        />
        {hasMath(question.question) && (
          <div className="mt-2 px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded text-[0.85rem] text-[#475569]">
            <span className="text-[#94a3b8] text-[0.7rem] font-semibold uppercase tracking-wider mr-2">{t('preview')}:</span>
            <MathText>{question.question}</MathText>
          </div>
        )}
      </div>

      {/* Answer editor area */}
      <div className="px-6 pb-6">
        {renderEditor()}
      </div>

      {/* Hint editor (always shown — teacher can add/edit/clear) */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[#f59e0b]">💡</span>
          <span className={`${TOKENS.typography.xs} font-semibold uppercase tracking-wider text-[#d97706]`}>{t('hint')}</span>
          <span className={`${TOKENS.typography.xs} text-[#94a3b8]`}>— {t('hintCost')}</span>
        </div>
        <input
          type="text"
          dir="auto"
          value={question.hint || ''}
          onChange={e => onChange({ ...question, hint: e.target.value })}
          placeholder={t('hintPlaceholder')}
          className={`${inputBase} bg-[#fef9c3]/30 border-[#fde68a] focus:ring-[#f59e0b]`}
        />
      </div>

      {/* Source citation (only if AI provided one) */}
      {question.sourceCitation && (
        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={() => setShowCitation(s => !s)}
            className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#6882a9] hover:text-[#091e42]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showCitation ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            {t('sourceCitation')}
          </button>
          {showCitation && (
            <div className="mt-2 px-3 py-2 bg-[#f8fafc] border-l-2 border-[#08b8fb] rounded text-[0.85rem] text-[#475569] italic">
              {question.sourceCitation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
