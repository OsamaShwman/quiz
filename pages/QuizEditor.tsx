import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import { QuizData, Question, DEFAULT_SETTINGS } from '../types';
import { QuestionCard } from '../components/QuestionCard';
import { Button } from '../components/Button';
import { Icons, TOKENS, FOCUS_RING } from '../constants';
import { generateQuizQuestions } from '../aiService';

const QuizEditor: React.FC = () => {
  const { state, updateQuiz, cloudConfig, loadCloudQuiz, saveCloudQuiz, isLoading, t } = useAppStore();

  const quiz = state.quizzes[0];
  const [localQuiz, setLocalQuiz] = useState<QuizData | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [aiText, setAiText] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
    if (!aiText.trim() && !aiFile) return;
    setIsGenerating(true);
    try {
      const result = await generateQuizQuestions(
        aiFile || aiText,
        localQuiz?.questions || []
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
      setAiText('');
      setAiFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      alert(t('aiError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t('fileLimit'));
        return;
      }
      setAiFile(file);
    }
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
            onChange={e => setAiText(e.target.value)}
            placeholder={t('aiPrompt')}
            rows={4}
            className={inputClass}
          />
          <div className="flex items-center gap-4">
            <Button variant="primary" size="md" onClick={handleAiGenerate} disabled={isGenerating || (!aiText.trim() && !aiFile)}>
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('generating')}
                </>
              ) : (
                <>
                  <Icons.Sparkles /> <span className="ml-2">{t('generate')}</span>
                </>
              )}
            </Button>
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors text-[#091e42]">
                <Icons.Paperclip />
                {aiFile ? aiFile.name : t('uploadFile')}
              </span>
            </label>
            <span className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('fileLimit')}</span>
          </div>
        </div>
      )}

      {/* Quiz Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={`${TOKENS.typography.xs} text-[#6882a9] mb-2 block`}>{t('quizTitle')}</label>
          <input
            type="text"
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
        className="group w-full py-8 border-2 border-dashed border-[#e2e8f0] rounded-2xl text-[#94a3b8] hover:border-[#ed3b91] hover:text-[#ed3b91] hover:bg-[#ed3b91]/[0.02] transition-all duration-300 flex flex-col items-center justify-center gap-2"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#f8fafc] group-hover:bg-[#ed3b91]/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
          <Icons.Plus />
        </div>
        <span className="text-[0.95rem] font-semibold">{t('addQuestion')}</span>
      </button>
    </div>
  );
};

export default QuizEditor;
