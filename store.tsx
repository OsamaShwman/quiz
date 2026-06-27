
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QuizData, QuizAttempt, AppState, DEFAULT_SETTINGS } from './types';
import { fetchArtifact, updateArtifact } from './api';

export type Language = 'en' | 'ar';

/**
 * Safe localStorage wrappers. Browsers can throw on storage access in several
 * situations — most importantly:
 *  - Safari private-browsing mode throws QuotaExceededError on setItem
 *  - Safari ITP and Chrome third-party-cookie restrictions can throw when the
 *    app is loaded inside a cross-origin iframe (e.g. embedded in the platform)
 *  - Some corporate browser policies block storage entirely
 *
 * A single uncaught throw during the AppProvider's initial render would crash
 * the whole tree and show a white page, so every call must be wrapped.
 */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn('[store] localStorage.getItem failed:', err);
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn('[store] localStorage.setItem failed:', err);
  }
}

export const translations = {
  en: {
    quiz: 'Quiz',
    quizEditor: 'String Quiz - Editor',
    quizSession: 'String Quiz',
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
    retry: 'Retry',
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
    fileLimit: 'Max 50MB',
    generating: 'Generating questions...',
    aiError: 'Failed to generate questions. Please try again.',
    numberOfQuestions: 'Number of Questions',
    difficulty: 'Difficulty',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    difficultySuperHard: 'Super Hard',
    difficultyMixed: 'Mixed',
    generateMore: 'Generate More Questions',
    clearInput: 'Clear input',
    printQuiz: 'Print Quiz',
    printAnswerKey: 'Print Answer Key',
    adaptiveMode: 'Adaptive difficulty',
    sourceCitation: 'Source',
    improveQuestion: 'Improve',
    rephrase: 'Rephrase',
    fixGrammar: 'Fix grammar',
    makeEasier: 'Make easier',
    makeHarder: 'Make harder',
    improving: 'Improving...',
    answerKey: 'Answer Key',
    showHint: 'Hint',
    hintShown: 'Hint shown',
    hint: 'Hint',
    hintCost: 'Using a hint costs 30% of this question\'s XP',
    hintPlaceholder: 'Optional hint shown to students who get stuck (without revealing the answer)',
    preview: 'Preview',
    xpSavedToAccount: 'XP added to your account',
    xpNotSavedRetake: 'Practice mode (no XP — you already completed this quiz)',
    xpFailed: 'Submission saved, but XP could not be added to your account. Please contact your teacher.',
    xpPending: 'Saving XP to your account...',
    autoSaved: 'Auto-saved',
    on: 'On',
    off: 'Off',
    typeAnswer: 'Type your answer...',
    matchInstruction: 'Match items on the left with items on the right',
    matchInstructionV2: 'Tap an item from the first group, then tap its match from the second group',
    matchTapItem: 'Tap an item',
    matchTapPair: 'Tap its match',
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
    studentName: 'Student',
    submittedAt: 'Submitted at',
    studentAnswers: 'Student Answers',
    reviewSubmission: 'Review Submission',
    submissionSaved: 'Results saved!',
    noSubmission: 'No submission found.',
    previousResults: 'Your Previous Results',
    viewPrevious: 'View Previous Results',
  },
  ar: {
    quiz: 'اختبار',
    quizEditor: 'String Quiz - المحرر',
    quizSession: 'String Quiz',
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
    retry: 'حاول مرة اخرى',
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
    fileLimit: 'الحد الاقصى 50 ميجابايت',
    generating: 'جاري التوليد...',
    aiError: 'فشل في توليد الاسئلة. حاول مرة اخرى.',
    numberOfQuestions: 'عدد الاسئلة',
    difficulty: 'مستوى الصعوبة',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    difficultySuperHard: 'صعب جدا',
    difficultyMixed: 'متنوع',
    generateMore: 'توليد اسئلة اضافية',
    clearInput: 'مسح المدخل',
    printQuiz: 'طباعة الاختبار',
    printAnswerKey: 'طباعة دليل الاجابات',
    adaptiveMode: 'الصعوبة التكيفية',
    sourceCitation: 'المصدر',
    improveQuestion: 'تحسين',
    rephrase: 'اعادة صياغة',
    fixGrammar: 'تصحيح القواعد',
    makeEasier: 'اجعله اسهل',
    makeHarder: 'اجعله اصعب',
    improving: 'جاري التحسين...',
    answerKey: 'دليل الاجابات',
    showHint: 'تلميح',
    hintShown: 'تم عرض التلميح',
    hint: 'تلميح',
    hintCost: 'استخدام التلميح يخصم 30% من نقاط هذا السؤال',
    hintPlaceholder: 'تلميح اختياري يظهر للطلاب الذين يحتاجون مساعدة (بدون كشف الاجابة)',
    preview: 'معاينة',
    xpSavedToAccount: 'تمت اضافة النقاط لحسابك',
    xpNotSavedRetake: 'وضع التدريب (لا نقاط - لقد اكملت هذا الاختبار سابقا)',
    xpFailed: 'تم حفظ الاختبار لكن لم تتم اضافة النقاط لحسابك. يرجى التواصل مع المعلم.',
    xpPending: 'جاري حفظ النقاط في حسابك...',
    autoSaved: 'حفظ تلقائي',
    on: 'مفعل',
    off: 'معطل',
    typeAnswer: 'اكتب اجابتك...',
    matchInstruction: 'صل العناصر على اليسار بالعناصر على اليمين',
    matchInstructionV2: 'اضغط على عنصر من المجموعة الاولى ثم اضغط على ما يطابقه من المجموعة الثانية',
    matchTapItem: 'اختر عنصرا',
    matchTapPair: 'اختر ما يطابقه',
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
    studentName: 'الطالب',
    submittedAt: 'تم التقديم في',
    studentAnswers: 'اجابات الطالب',
    reviewSubmission: 'مراجعة التقديم',
    submissionSaved: 'تم حفظ النتائج!',
    noSubmission: 'لا يوجد تقديم.',
    previousResults: 'نتائجك السابقة',
    viewPrevious: 'عرض النتائج السابقة',
  }
};

export interface CloudConfig {
  id: string;
  token: string;
  mode: 'teacher' | 'student' | null;
  submissionId: string | null;
  spaceId: string | null;
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
  loadError: string | null;
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
      return (safeGet('quiz_lang') as Language) || 'en';
    }
    return 'en';
  });

  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = safeGet('quiz_state_v1');
      return saved ? JSON.parse(saved) : { quizzes: [], attempts: [] };
    } catch {
      return { quizzes: [], attempts: [] };
    }
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({ id: '', token: '', mode: null, submissionId: null, spaceId: null });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize Credentials
  useEffect(() => {
    let params = new URLSearchParams(window.location.search);
    let id = params.get('id');
    let token = params.get('token');
    let submissionId = params.get('submission_id');
    let spaceId = params.get('space_id');
    let modeParam = params.get('mode');

    if (!id || !token || !spaceId || !modeParam) {
      if (window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        if (!id) id = hashParams.get('id');
        if (!token) token = hashParams.get('token');
        if (!submissionId) submissionId = hashParams.get('submission_id');
        if (!spaceId) spaceId = hashParams.get('space_id');
        if (!modeParam) modeParam = hashParams.get('mode');
      }
    }
    const mode: 'teacher' | 'student' | null =
      modeParam === 'teacher' ? 'teacher' :
      modeParam === 'student' || modeParam === 'view' ? 'student' :
      null;

    if (!id || !token) {
      const savedId = safeGet('quiz_cloud_id');
      const savedToken = safeGet('quiz_cloud_token');
      if (savedId && savedToken) {
        id = savedId;
        token = savedToken;
        console.log('Credentials restored from local storage');
      }
    }

    console.log('[App] Initializing. ID found:', !!id, 'Token found:', !!token, 'Mode:', mode, 'SubmissionId:', submissionId, 'SpaceId:', spaceId);

    if (id && token) {
      setCloudConfig({ id, token, mode, submissionId: submissionId || null, spaceId: spaceId || null });
      safeSet('quiz_cloud_id', id);
      safeSet('quiz_cloud_token', token);
    } else {
      console.warn('[App] No credentials found in URL or Storage. Cloud features will be disabled.');
    }
  }, []);

  useEffect(() => {
    safeSet('quiz_state_v1', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    safeSet('quiz_lang', language);
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
      setLoadError('Missing credentials');
      return;
    }

    console.log('[Load] Fetching cloud quiz...', cloudConfig.id);
    setIsLoading(true);
    setLoadError(null);
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
      setLoadError(translations[language].cloudError || 'Failed to load quiz');
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
      isLoading,
      loadError
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
