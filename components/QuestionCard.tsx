import React from 'react';
import { Question, QuestionType, MCQQuestion, TrueFalseQuestion, FillBlankQuestion, MatchingQuestion } from '../types';
import { useAppStore } from '../store';
import { Button } from './Button';
import { Icons, TOKENS, FOCUS_RING } from '../constants';

interface QuestionCardProps {
  question: Question;
  index: number;
  onChange: (updated: Question) => void;
  onRemove: () => void;
}

const TYPE_THEME = {
  mcq: { color: '#ed3b91', bg: 'bg-[#ed3b91]', bgLight: 'bg-[#ed3b91]/5', border: 'border-[#ed3b91]', text: 'text-[#ed3b91]', accent: '#ed3b91', label: 'MCQ' },
  true_false: { color: '#08b8fb', bg: 'bg-[#08b8fb]', bgLight: 'bg-[#08b8fb]/5', border: 'border-[#08b8fb]', text: 'text-[#08b8fb]', accent: '#08b8fb', label: 'T/F' },
  fill_blank: { color: '#f59e0b', bg: 'bg-[#f59e0b]', bgLight: 'bg-[#f59e0b]/5', border: 'border-[#f59e0b]', text: 'text-[#f59e0b]', accent: '#f59e0b', label: 'Fill' },
  matching: { color: '#a855f7', bg: 'bg-[#a855f7]', bgLight: 'bg-[#a855f7]/5', border: 'border-[#a855f7]', text: 'text-[#a855f7]', accent: '#a855f7', label: 'Match' },
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const inputBase = `w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-[0.9rem] text-[#091e42] placeholder-[#b0bec5] transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:outline-none hover:border-[#cbd5e1] bg-white`;

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, index, onChange, onRemove }) => {
  const { t } = useAppStore();
  const theme = TYPE_THEME[question.type];

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
    }
  };

  const typeButtons: { type: QuestionType; key: keyof typeof TYPE_THEME }[] = [
    { type: 'mcq', key: 'mcq' },
    { type: 'true_false', key: 'true_false' },
    { type: 'fill_blank', key: 'fill_blank' },
    { type: 'matching', key: 'matching' },
  ];

  const renderMCQEditor = (q: MCQQuestion) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {q.options.map((opt, i) => {
        const isCorrect = q.correctIndex === i;
        return (
          <div
            key={i}
            onClick={() => onChange({ ...q, correctIndex: i as 0 | 1 | 2 | 3 })}
            className={`group relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              isCorrect
                ? 'border-[#22c55e] bg-[#22c55e]/5 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]'
                : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:shadow-sm'
            }`}
          >
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
        <div key={i} className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute start-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#f59e0b]/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <input
              type="text"
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
        <div key={i} className="flex items-center gap-2">
          {/* Left side */}
          <div className="flex-1 relative">
            <div className="absolute start-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#a855f7]/10 flex items-center justify-center text-[0.7rem] font-bold text-[#a855f7]">
              {i + 1}
            </div>
            <input
              type="text"
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

  const renderEditor = () => {
    switch (question.type) {
      case 'mcq': return renderMCQEditor(question);
      case 'true_false': return renderTrueFalseEditor(question);
      case 'fill_blank': return renderFillBlankEditor(question);
      case 'matching': return renderMatchingEditor(question);
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
                  {tb.type === 'mcq' ? t('mcq') : tb.type === 'true_false' ? t('trueFalse') : tb.type === 'fill_blank' ? t('fillBlank') : t('matching')}
                </button>
              );
            })}
          </div>
        </div>
        {/* Delete */}
        <button
          onClick={onRemove}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#cbd5e1] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          <Icons.Trash />
        </button>
      </div>

      {/* Question input */}
      <div className="px-6 pb-4">
        <input
          type="text"
          value={question.question}
          onChange={e => onChange({ ...question, question: e.target.value } as Question)}
          placeholder={t('questionPlaceholder')}
          className="w-full px-0 py-3 border-none border-b-2 border-[#e2e8f0] bg-transparent text-[1.05rem] font-medium text-[#091e42] placeholder-[#b0bec5] focus:outline-none focus:border-b-2 transition-all"
          style={{ borderBottom: `2px solid #e2e8f0`, borderRadius: 0 }}
          onFocus={e => e.target.style.borderBottomColor = theme.color}
          onBlur={e => e.target.style.borderBottomColor = '#e2e8f0'}
        />
      </div>

      {/* Answer editor area */}
      <div className="px-6 pb-6">
        {renderEditor()}
      </div>
    </div>
  );
};
