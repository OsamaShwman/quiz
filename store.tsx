
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QuizData, QuizAttempt, AppState, DEFAULT_SETTINGS } from './types';
import { fetchArtifact, updateArtifact } from './api';

export type Language = 'en' | 'ar';

export const translations = {
  en: {
    quiz: 'Quiz',
    quizEditor: 'Quiz Editor',
    quizSession: 'Quiz Session',
    createQuiz: 'Create Quiz',
    editQuiz: 'Edit Quiz',
    quizTitle: 'Quiz Title',
    description: 'Description',
    titlePlaceholder: 'e.g. Biology 101 - Cell Division',
    descriptionPlaceholder: 'What will this quiz test?',
    addQuestion: 'Add Question',
    removeQuestion: 'Remove',
    question: 'Question',
    questionPlaceholder: 'Enter your question...',
    questionType: 'Question Type',
    mcq: 'Multiple Choice',
    trueFalse: 'True / False',
    fillBlank: 'Fill in the Blank',
    matching: 'Matching',
    option: 'Option',
    correctAnswer: 'Correct Answer',
    acceptedAnswers: 'Accepted Answers',
    addAnswer: 'Add Answer',
    caseSensitive: 'Case Sensitive',
    pair: 'Pair',
    left: 'Left',
    right: 'Right',
    addPair: 'Add Pair',
    settings: 'Settings',
    mode: 'Mode',
    timed: 'Timed',
    selfPaced: 'Self-Paced',
    timePerQuestion: 'Time per Question (sec)',
    shuffleQuestions: 'Shuffle Questions',
    showCorrectAfterEach: 'Show correct answer after each question',
    saveDraft: 'Save Draft',
    publish: 'Publish',
    saving: 'Saving...',
    saved: 'Saved',
    published: 'Published',
    draft: 'Draft',
    loading: 'Loading...',
    cloudError: 'Error connecting to cloud.',
    saveSuccess: 'Saved successfully!',
    startQuiz: 'Start Quiz',
    questions: 'Questions',
    timedMode: 'Timed Mode',
    selfPacedMode: 'Self-Paced Mode',
    perQuestion: 'per question',
    next: 'Next',
    submit: 'Submit',
    skipQuestion: 'Skip',
    timeUp: 'Time\'s up!',
    results: 'Results',
    score: 'Score',
    correct: 'Correct',
    incorrect: 'Incorrect',
    skipped: 'Skipped',
    retake: 'Retake Quiz',
    review: 'Review Answers',
    yourAnswer: 'Your Answer',
    correctAnswerIs: 'Correct Answer',
    questionOf: 'of',
    true: 'True',
    false: 'False',
    noQuestions: 'No questions in this quiz.',
    aiTools: 'AI Generator',
    aiPrompt: 'Enter text or upload a file (PDF/TXT/Image) to generate questions...',
    generate: 'Generate Questions',
    uploadFile: 'Upload File',
    fileLimit: 'Max 5MB',
    generating: 'Generating questions...',
    aiError: 'Failed to generate questions. Please try again.',
    autoSaved: 'Auto-saved',
    on: 'On',
    off: 'Off',
    typeAnswer: 'Type your answer...',
    matchInstruction: 'Match items on the left with items on the right',
    congratulations: 'Congratulations!',
    keepPracticing: 'Keep Practicing!',
    excellentScore: 'Excellent work! You really know this material.',
    goodScore: 'Good job! Review the ones you missed.',
    lowScore: 'Don\'t worry! Review the material and try again.',
    xp: 'XP',
    level: 'Level',
    levelUp: 'Level Up',
    streak: 'Streak',
    onFire: 'ON FIRE',
    stars: 'Stars',
    starsEarned: 'Stars Earned',
    xpEarned: 'XP Earned',
    totalXP: 'Total XP',
    speedBonus: 'Speed Bonus',
    streakBonus: 'Streak Bonus',
    newLevel: 'New Level',
    perfectScore: 'Perfect Score!',
    greatJob: 'Great Job!',
    niceWork: 'Nice Work!',
    multiSelect: 'Multi-Select',
    selectAllCorrect: 'Select all correct answers',
  },
  ar: {
    quiz: 'اختبار',
    quizEditor: 'محرر الاختبار',
    quizSession: 'جلسة الاختبار',
    createQuiz: 'انشاء اختبار',
    editQuiz: 'تعديل الاختبار',
    quizTitle: 'عنوان الاختبار',
    description: 'الوصف',
    titlePlaceholder: 'مثال: احياء 101 - انقسام الخلية',
    descriptionPlaceholder: 'ماذا سيختبر هذا الاختبار؟',
    addQuestion: 'اضافة سؤال',
    removeQuestion: 'حذف',
    question: 'السؤال',
    questionPlaceholder: 'ادخل سؤالك...',
    questionType: 'نوع السؤال',
    mcq: 'اختيار من متعدد',
    trueFalse: 'صح / خطا',
    fillBlank: 'املا الفراغ',
    matching: 'توصيل',
    option: 'خيار',
    correctAnswer: 'الاجابة الصحيحة',
    acceptedAnswers: 'الاجابات المقبولة',
    addAnswer: 'اضافة اجابة',
    caseSensitive: 'حساس لحالة الاحرف',
    pair: 'زوج',
    left: 'يسار',
    right: 'يمين',
    addPair: 'اضافة زوج',
    settings: 'الاعدادات',
    mode: 'الوضع',
    timed: 'موقت',
    selfPaced: 'حر',
    timePerQuestion: 'الوقت لكل سؤال (ثانية)',
    shuffleQuestions: 'خلط الاسئلة',
    showCorrectAfterEach: 'عرض الاجابة الصحيحة بعد كل سؤال',
    saveDraft: 'حفظ مسودة',
    publish: 'نشر',
    saving: 'جاري الحفظ...',
    saved: 'تم الحفظ',
    published: 'منشور',
    draft: 'مسودة',
    loading: 'جاري التحميل...',
    cloudError: 'خطا في الاتصال بالسحابة.',
    saveSuccess: 'تم الحفظ بنجاح!',
    startQuiz: 'ابدا الاختبار',
    questions: 'اسئلة',
    timedMode: 'وضع موقت',
    selfPacedMode: 'وضع حر',
    perQuestion: 'لكل سؤال',
    next: 'التالي',
    submit: 'ارسال',
    skipQuestion: 'تخطي',
    timeUp: 'انتهى الوقت!',
    results: 'النتائج',
    score: 'النتيجة',
    correct: 'صحيح',
    incorrect: 'خطا',
    skipped: 'تم التخطي',
    retake: 'اعادة الاختبار',
    review: 'مراجعة الاجابات',
    yourAnswer: 'اجابتك',
    correctAnswerIs: 'الاجابة الصحيحة',
    questionOf: 'من',
    true: 'صح',
    false: 'خطا',
    noQuestions: 'لا توجد اسئلة في هذا الاختبار.',
    aiTools: 'مولد الذكاء الاصطناعي',
    aiPrompt: 'ادخل نصا او ارفع ملفا (PDF/TXT/صورة) لتوليد الاسئلة...',
    generate: 'توليد الاسئلة',
    uploadFile: 'رفع ملف',
    fileLimit: 'الحد الاقصى 5 ميجابايت',
    generating: 'جاري التوليد...',
    aiError: 'فشل في توليد الاسئلة. حاول مرة اخرى.',
    autoSaved: 'حفظ تلقائي',
    on: 'مفعل',
    off: 'معطل',
    typeAnswer: 'اكتب اجابتك...',
    matchInstruction: 'صل العناصر على اليسار بالعناصر على اليمين',
    congratulations: 'تهانينا!',
    keepPracticing: 'واصل التدريب!',
    excellentScore: 'عمل ممتاز! انت تعرف هذه المادة جيدا.',
    goodScore: 'عمل جيد! راجع الاسئلة التي اخطات فيها.',
    lowScore: 'لا تقلق! راجع المادة وحاول مرة اخرى.',
    xp: 'نقاط الخبرة',
    level: 'المستوى',
    levelUp: 'ارتقاء المستوى',
    streak: 'سلسلة',
    onFire: 'مشتعل',
    stars: 'نجوم',
    starsEarned: 'النجوم المكتسبة',
    xpEarned: 'نقاط الخبرة المكتسبة',
    totalXP: 'مجموع نقاط الخبرة',
    speedBonus: 'مكافاة السرعة',
    streakBonus: 'مكافاة السلسلة',
    newLevel: 'مستوى جديد',
    perfectScore: 'نتيجة مثالية!',
    greatJob: 'عمل رائع!',
    niceWork: 'عمل جيد!',
    multiSelect: 'اختيار متعدد',
    selectAllCorrect: 'اختر جميع الاجابات الصحيحة',
  }
};

export interface CloudConfig {
  id: string;
  token: string;
  mode: 'teacher' | 'student' | null;
}

interface AppContextType {
  state: AppState;
  updateQuiz: (quiz: QuizData) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  cloudConfig: CloudConfig;
  loadCloudQuiz: () => Promise<void>;
  saveCloudQuiz: (quiz: QuizData, silent?: boolean) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      let params = new URLSearchParams(window.location.search);
      let langParam = params.get('lang');

      if (!langParam && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        langParam = hashParams.get('lang');
      }

      if (langParam === 'ar' || langParam === 'en') {
        return langParam as Language;
      }
      return (localStorage.getItem('quiz_lang') as Language) || 'en';
    }
    return 'en';
  });

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('quiz_state_v1');
    return saved ? JSON.parse(saved) : { quizzes: [], attempts: [] };
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({ id: '', token: '', mode: null });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Credentials
  useEffect(() => {
    let params = new URLSearchParams(window.location.search);
    let id = params.get('id');
    let token = params.get('token');

    if (!id || !token) {
      if (window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        if (!id) id = hashParams.get('id');
        if (!token) token = hashParams.get('token');
      }
    }

    if (!id || !token) {
      const savedId = localStorage.getItem('quiz_cloud_id');
      const savedToken = localStorage.getItem('quiz_cloud_token');
      if (savedId && savedToken) {
        id = savedId;
        token = savedToken;
        console.log('Credentials restored from local storage');
      }
    }

    console.log('[App] Initializing. ID found:', !!id, 'Token found:', !!token);

    if (id && token) {
      setCloudConfig({ id, token, mode: null });
      localStorage.setItem('quiz_cloud_id', id);
      localStorage.setItem('quiz_cloud_token', token);
    } else {
      console.warn('[App] No credentials found in URL or Storage. Cloud features will be disabled.');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('quiz_state_v1', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('quiz_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const updateQuiz = useCallback((quiz: QuizData) => {
    setState(prev => {
      const exists = prev.quizzes.some(q => q.id === quiz.id);
      return {
        ...prev,
        quizzes: exists
          ? prev.quizzes.map(q => q.id === quiz.id ? quiz : q)
          : [...prev.quizzes, quiz]
      };
    });
  }, []);

  const t = useCallback((key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  }, [language]);

  const loadCloudQuiz = useCallback(async () => {
    if (!cloudConfig.id || !cloudConfig.token) {
      console.error('[Load] Missing credentials in loadCloudQuiz', cloudConfig);
      return;
    }

    console.log('[Load] Fetching cloud quiz...', cloudConfig.id);
    setIsLoading(true);
    try {
      const artifactDataStr = await fetchArtifact(cloudConfig.id, cloudConfig.token);
      let quiz: QuizData;

      if (artifactDataStr && artifactDataStr.trim() !== '') {
        try {
          const parsed = JSON.parse(artifactDataStr);
          quiz = { ...parsed, id: cloudConfig.id };
          // Ensure settings exist
          if (!quiz.settings) {
            quiz.settings = { ...DEFAULT_SETTINGS };
          }
          if (!quiz.questions) {
            quiz.questions = [];
          }
          console.log('[Load] Successfully parsed quiz:', quiz);
        } catch (parseError) {
          console.error("[Load] Failed to parse artifact data", parseError);
          quiz = {
            id: cloudConfig.id,
            title: '',
            description: '',
            status: 'draft',
            questions: [],
            settings: { ...DEFAULT_SETTINGS },
            attemptCount: 0,
          };
        }
      } else {
        console.log('[Load] Artifact empty. Initializing new quiz.');
        quiz = {
          id: cloudConfig.id,
          title: '',
          description: '',
          status: 'draft',
          questions: [],
          settings: { ...DEFAULT_SETTINGS },
          attemptCount: 0,
        };
      }

      setState(prev => ({ ...prev, quizzes: [quiz] }));

    } catch (e) {
      console.error('[Load] Cloud Load Error:', e);
      alert(translations[language].cloudError);
    } finally {
      setIsLoading(false);
    }
  }, [cloudConfig, language]);

  const saveCloudQuiz = useCallback(async (quiz: QuizData, silent = false) => {
    console.log('[Save] Attempting to save quiz...', quiz.id, 'Silent:', silent);

    if (!cloudConfig.id || !cloudConfig.token) {
      console.error('[Save] ABORTED: Missing Credentials.', cloudConfig);
      if (!silent) alert('Error: Missing API Credentials. Please reload from the provided link.');
      return;
    }

    const hasContent = quiz.title.trim() || quiz.questions.length > 0;
    if (!hasContent) {
      console.log('[Save] Skipped: quiz is empty.');
      return;
    }

    if (!silent) setIsLoading(true);
    try {
      const dataToSave = JSON.stringify({ ...quiz, id: cloudConfig.id });

      console.log('[Save] Sending data to API...');
      await updateArtifact(cloudConfig.id, cloudConfig.token, dataToSave);
      console.log('[Save] API success.');

      setState(prev => ({
        ...prev,
        quizzes: prev.quizzes.map(q => q.id === quiz.id ? quiz : q)
      }));

    } catch (e) {
      console.error('[Save] Cloud Save Error:', e);
      if (!silent) alert(translations[language].cloudError);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [cloudConfig, language]);

  return (
    <AppContext.Provider value={{
      state,
      updateQuiz,
      language,
      setLanguage,
      t,
      cloudConfig,
      loadCloudQuiz,
      saveCloudQuiz,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
