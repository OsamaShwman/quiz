import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store';
import { QuizData, Question, DEFAULT_SETTINGS } from '../types';
import { QuestionCard } from '../components/QuestionCard';
import { Button } from '../components/Button';
import { Icons, TOKENS, FOCUS_RING } from '../constants';
import { generateQuizQuestions, Difficulty } from '../aiService';
import { MathText } from '../components/MathText';

const QuizEditor: React.FC = () => {
  const { state, updateQuiz, cloudConfig, loadCloudQuiz, saveCloudQuiz, isLoading, t } = useAppStore();

  const quiz = state.quizzes[0];
  const [localQuiz, setLocalQuiz] = useState<QuizData | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [aiText, setAiText] = useState('');
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('mixed');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cloud data on mount
  useEffect(() => {
    if (cloudConfig.id && cloudConfig.token) {
      loadCloudQuiz();
    }
  }, [cloudConfig.id, cloudConfig.token]);

  // Sync cloud quiz to local state, or init a blank quiz
  useEffect(() => {
    if (quiz) {
      setLocalQuiz({ ...quiz });
    } else if (!cloudConfig.id) {
      setLocalQuiz({
        id: 'local',
        title: '',
        description: '',
        status: 'draft',
        questions: [],
        settings: { ...DEFAULT_SETTINGS },
        attemptCount: 0,
      });
    }
  }, [quiz, cloudConfig.id]);

  // Auto-save
  const triggerAutoSave = useCallback((quizToSave: QuizData) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      if (cloudConfig.id) {
        await saveCloudQuiz(quizToSave, true);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 3000);
  }, [cloudConfig.id, saveCloudQuiz]);

  const handleQuizChange = useCallback((updated: Partial<QuizData>) => {
    setLocalQuiz(prev => {
      if (!prev) return prev;
      const newQuiz = { ...prev, ...updated };
      updateQuiz(newQuiz);
      triggerAutoSave(newQuiz);
      return newQuiz;
    });
  }, [updateQuiz, triggerAutoSave]);

  const handleQuestionChange = useCallback((index: number, updated: Question) => {
    setLocalQuiz(prev => {
      if (!prev) return prev;
      const newQuestions = [...prev.questions];
      newQuestions[index] = updated;
      const newQuiz = { ...prev, questions: newQuestions };
      updateQuiz(newQuiz);
      triggerAutoSave(newQuiz);
      return newQuiz;
    });
  }, [updateQuiz, triggerAutoSave]);

  const handleRemoveQuestion = useCallback((index: number) => {
    setLocalQuiz(prev => {
      if (!prev) return prev;
      const newQuestions = prev.questions.filter((_, i) => i !== index);
      const newQuiz = { ...prev, questions: newQuestions };
      updateQuiz(newQuiz);
      triggerAutoSave(newQuiz);
      return newQuiz;
    });
  }, [updateQuiz, triggerAutoSave]);

  const handleAddQuestion = useCallback(() => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
    };
    setLocalQuiz(prev => {
      if (!prev) return prev;
      const newQuiz = { ...prev, questions: [...prev.questions, newQuestion] };
      updateQuiz(newQuiz);
      triggerAutoSave(newQuiz);
      return newQuiz;
    });
  }, [updateQuiz, triggerAutoSave]);

  const handleSave = async (status: 'draft' | 'published') => {
    if (!localQuiz) return;
    setSaveStatus('saving');
    const quizToSave = { ...localQuiz, status };
    updateQuiz(quizToSave);
    await saveCloudQuiz(quizToSave);
    setLocalQuiz(quizToSave);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleAiGenerate = async () => {
    if (!aiText.trim() && aiFiles.length === 0) return;
    setIsGenerating(true);
    try {
      const result = await generateQuizQuestions(
        aiFiles.length > 0 ? aiFiles : aiText,
        localQuiz?.questions || [],
        aiQuestionCount,
        aiDifficulty
      );
      if (result.questions.length > 0) {
        setLocalQuiz(prev => {
          if (!prev) return prev;
          const newQuiz = {
            ...prev,
            title: prev.title || result.title,
            questions: [...prev.questions, ...result.questions],
          };
          updateQuiz(newQuiz);
          triggerAutoSave(newQuiz);
          return newQuiz;
        });
      }
      // Keep aiText and aiFile so the teacher can generate more questions from the same source
    } catch {
      alert(t('aiError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const oversize = files.find(f => f.size > 50 * 1024 * 1024);
    if (oversize) {
      alert(t('fileLimit'));
      return;
    }
    setAiFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (idx: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== idx));
  };

  if (isLoading && !localQuiz) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#08b8fb] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!localQuiz) {
    return (
      <div className="text-center py-20 text-[#6882a9]">
        {t('loading')}
      </div>
    );
  }

  const inputClass = `w-full px-4 py-3 border border-[#e2e8f0] rounded-xl ${TOKENS.typography.base} text-[#091e42] placeholder-[#6882a9] ${FOCUS_RING} hover:border-[#cbd5e1]`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${TOKENS.typography.title} text-[#091e42]`}>{t('quizEditor')}</h1>
          <p className={`${TOKENS.typography.sm} text-[#6882a9] mt-1`}>
            {localQuiz.questions.length} {t('questions')}
            {saveStatus === 'saved' && <span className="ml-3 text-[#22c55e]">{t('autoSaved')}</span>}
            {saveStatus === 'saving' && <span className="ml-3 text-[#f59e0b]">{t('saving')}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="md" onClick={() => setShowSettings(!showSettings)}>
            <Icons.Settings /> <span className="ml-2">{t('settings')}</span>
          </Button>
          <Button variant="outline" size="md" onClick={() => setShowAiPanel(!showAiPanel)}>
            <Icons.Sparkles /> <span className="ml-2">{t('aiTools')}</span>
          </Button>
          <Button variant="outline" size="md" onClick={() => {
            document.body.classList.remove('print-answers');
            document.body.classList.add('printing');
            window.print();
            setTimeout(() => document.body.classList.remove('printing'), 500);
          }}>
            <span className="ml-1">{t('printQuiz')}</span>
          </Button>
          <Button variant="outline" size="md" onClick={() => {
            document.body.classList.add('print-answers');
            document.body.classList.add('printing');
            window.print();
            setTimeout(() => {
              document.body.classList.remove('print-answers');
              document.body.classList.remove('printing');
            }, 500);
          }}>
            <span className="ml-1">{t('printAnswerKey')}</span>
          </Button>
<Button variant="primary" size="md" onClick={() => handleSave('published')} disabled={saveStatus === 'saving'}>
            {t('publish')}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6 space-y-4">
          <h3 className={`${TOKENS.typography.xl} text-[#091e42]`}>{t('settings')}</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={`${TOKENS.typography.xs} text-[#6882a9] mb-2 block`}>{t('mode')}</label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleQuizChange({ settings: { ...localQuiz.settings, mode: 'timed' } })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${localQuiz.settings.mode === 'timed' ? 'border-[#ed3b91] bg-[#ed3b91]/5 text-[#ed3b91]' : 'border-[#e2e8f0] text-[#6882a9] hover:border-[#cbd5e1]'}`}
                >
                  <Icons.Clock /> {t('timed')}
                </button>
                <button
                  onClick={() => handleQuizChange({ settings: { ...localQuiz.settings, mode: 'self_paced' } })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${localQuiz.settings.mode === 'self_paced' ? 'border-[#08b8fb] bg-[#08b8fb]/5 text-[#08b8fb]' : 'border-[#e2e8f0] text-[#6882a9] hover:border-[#cbd5e1]'}`}
                >
                  <Icons.Play /> {t('selfPaced')}
                </button>
              </div>
            </div>
            {localQuiz.settings.mode === 'timed' && (
              <div>
                <label className={`${TOKENS.typography.xs} text-[#6882a9] mb-2 block`}>{t('timePerQuestion')}</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={localQuiz.settings.timePerQuestion}
                  onChange={e => handleQuizChange({ settings: { ...localQuiz.settings, timePerQuestion: parseInt(e.target.value) || 30 } })}
                  className={`w-32 px-3 py-2 border border-[#e2e8f0] rounded-lg ${TOKENS.typography.base} text-[#091e42] ${FOCUS_RING}`}
                />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localQuiz.settings.shuffleQuestions}
                onChange={e => handleQuizChange({ settings: { ...localQuiz.settings, shuffleQuestions: e.target.checked } })}
                className="w-5 h-5 accent-[#08b8fb] rounded"
              />
              <span className={TOKENS.typography.base}>{t('shuffleQuestions')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localQuiz.settings.showCorrectAfterEach}
                onChange={e => handleQuizChange({ settings: { ...localQuiz.settings, showCorrectAfterEach: e.target.checked } })}
                className="w-5 h-5 accent-[#08b8fb] rounded"
              />
              <span className={TOKENS.typography.base}>{t('showCorrectAfterEach')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localQuiz.settings.adaptive ?? false}
                onChange={e => handleQuizChange({ settings: { ...localQuiz.settings, adaptive: e.target.checked } })}
                className="w-5 h-5 accent-[#08b8fb] rounded"
              />
              <span className={TOKENS.typography.base}>{t('adaptiveMode')}</span>
            </label>
          </div>
        </div>
      )}

      {/* AI Panel */}
      {showAiPanel && (
        <div className="bg-gradient-to-r from-[#ed3b91]/5 to-[#08b8fb]/5 border border-[#e2e8f0] rounded-xl p-6 space-y-4">
          <h3 className={`${TOKENS.typography.xl} text-[#091e42] flex items-center gap-2`}>
            <Icons.Sparkles /> {t('aiTools')}
          </h3>
          <textarea
            value={aiText}
            dir="auto"
            onChange={e => setAiText(e.target.value)}
            placeholder={t('aiPrompt')}
            rows={4}
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`${TOKENS.typography.xs} text-[#6882a9] mb-1 block`}>{t('numberOfQuestions')}</label>
              <select
                value={aiQuestionCount}
                onChange={e => setAiQuestionCount(Number(e.target.value))}
                className={`w-full px-3 py-2 border border-[#e2e8f0] rounded-lg bg-white text-[#091e42] ${TOKENS.typography.base} ${FOCUS_RING}`}
              >
                {[5, 10, 15, 20, 25, 30].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`${TOKENS.typography.xs} text-[#6882a9] mb-1 block`}>{t('difficulty')}</label>
              <select
                value={aiDifficulty}
                onChange={e => setAiDifficulty(e.target.value as Difficulty)}
                className={`w-full px-3 py-2 border border-[#e2e8f0] rounded-lg bg-white text-[#091e42] ${TOKENS.typography.base} ${FOCUS_RING}`}
              >
                <option value="easy">{t('difficultyEasy')}</option>
                <option value="medium">{t('difficultyMedium')}</option>
                <option value="hard">{t('difficultyHard')}</option>
                <option value="super_hard">{t('difficultySuperHard')}</option>
                <option value="mixed">{t('difficultyMixed')}</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="primary" size="md" onClick={handleAiGenerate} disabled={isGenerating || (!aiText.trim() && aiFiles.length === 0)}>
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('generating')}
                </>
              ) : (
                <>
                  <Icons.Sparkles /> <span className="ml-2">{(localQuiz?.questions.length ?? 0) > 0 ? t('generateMore') : t('generate')}</span>
                </>
              )}
            </Button>
            {(aiText || aiFiles.length > 0) && !isGenerating && (
              <button
                type="button"
                onClick={() => {
                  setAiText('');
                  setAiFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className={`${TOKENS.typography.sm} text-[#6882a9] hover:text-[#091e42] underline`}
              >
                {t('clearInput')}
              </button>
            )}
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors text-[#091e42]">
                <Icons.Paperclip />
                {t('uploadFile')}
              </span>
            </label>
            <span className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('fileLimit')}</span>
          </div>
          {aiFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[0.85rem] text-[#091e42]">
                  <Icons.Paperclip />
                  <span className="max-w-[200px] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="text-[#94a3b8] hover:text-[#ef4444]"
                    aria-label="remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quiz Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={`${TOKENS.typography.xs} text-[#6882a9] mb-2 block`}>{t('quizTitle')}</label>
          <input
            type="text"
            dir="auto"
            value={localQuiz.title}
            onChange={e => handleQuizChange({ title: e.target.value })}
            placeholder={t('titlePlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={`${TOKENS.typography.xs} text-[#6882a9] mb-2 block`}>{t('description')}</label>
          <input
            type="text"
            dir="auto"
            value={localQuiz.description}
            onChange={e => handleQuizChange({ description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
            className={inputClass}
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-5">
        {localQuiz.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onChange={updated => handleQuestionChange(index, updated)}
            onRemove={() => handleRemoveQuestion(index)}
          />
        ))}
      </div>

      {/* Add Question Button */}
      <button
        onClick={handleAddQuestion}
        className="group w-full py-8 border-2 border-dashed border-[#e2e8f0] rounded-2xl text-[#94a3b8] hover:border-[#ed3b91] hover:text-[#ed3b91] hover:bg-[#ed3b91]/[0.02] transition-all duration-300 flex flex-col items-center justify-center gap-2 no-print"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#f8fafc] group-hover:bg-[#ed3b91]/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
          <Icons.Plus />
        </div>
        <span className="text-[0.95rem] font-semibold">{t('addQuestion')}</span>
      </button>

      {/* Printable view rendered into a portal so the original app can be hidden during print */}
      {typeof document !== 'undefined' && document.getElementById('print-portal') && createPortal(
        <div className="print-only" dir="auto">
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem' }}>{localQuiz.title || t('quizEditor')}</h1>
          {localQuiz.description && <p style={{ marginBottom: '1rem', color: '#475569' }}>{localQuiz.description}</p>}
          <p style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#6882a9' }}>
            {localQuiz.questions.length} {t('questions')}
          </p>
          <div>
            {localQuiz.questions.map((q, i) => {
              let answerLine = '';
              if (q.type === 'mcq') answerLine = `${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`;
              else if (q.type === 'true_false') answerLine = q.correctAnswer ? t('true') : t('false');
              else if (q.type === 'fill_blank') answerLine = q.acceptedAnswers.join(' / ');
              else if (q.type === 'matching') answerLine = q.pairs.map(p => `${p.left} = ${p.right}`).join(' | ');
              else if (q.type === 'multi_select') answerLine = q.correctIndices.map((idx: number) => `${String.fromCharCode(65 + idx)}. ${q.options[idx]}`).join(', ');

              return (
                <div key={q.id} className="print-question">
                  <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem' }}>
                    <span>{i + 1}.</span>
                    <span style={{ flex: 1 }}><MathText>{q.question}</MathText></span>
                  </div>
                  {(q.type === 'mcq' || q.type === 'multi_select') && (
                    <div style={{ marginTop: '0.5rem', paddingInlineStart: '1.5rem' }}>
                      {q.options.map((opt, j) => (
                        <div key={j} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, minWidth: '1.5rem' }}>{String.fromCharCode(65 + j)}.</span>
                          <span><MathText>{opt}</MathText></span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'matching' && (
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <strong>{t('left')}:</strong>
                        <ul style={{ paddingInlineStart: '1.25rem', margin: '0.25rem 0 0 0' }}>{q.pairs.map((p, j) => <li key={j}><MathText>{p.left}</MathText></li>)}</ul>
                      </div>
                      <div>
                        <strong>{t('right')}:</strong>
                        <ul style={{ paddingInlineStart: '1.25rem', margin: '0.25rem 0 0 0' }}>{[...q.pairs].sort(() => Math.random() - 0.5).map((p, j) => <li key={j}><MathText>{p.right}</MathText></li>)}</ul>
                      </div>
                    </div>
                  )}
                  {q.type === 'fill_blank' && (
                    <div style={{ marginTop: '0.5rem', borderBottom: '1px solid #94a3b8', height: '1.5rem' }} />
                  )}
                  {q.type === 'true_false' && (
                    <div style={{ marginTop: '0.5rem' }}>{t('true')} / {t('false')}</div>
                  )}
                  <div className="print-answer-key">
                    {t('answerKey')}: <MathText>{answerLine}</MathText>
                  </div>
                  {q.sourceCitation && (
                    <div className="print-answer-key print-citation">
                      {t('sourceCitation')}: {q.sourceCitation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.getElementById('print-portal')!
      )}
    </div>
  );
};

export default QuizEditor;
