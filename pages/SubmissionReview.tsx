import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { SubmissionContent, SubmissionResponse } from '../types';
import { getSubmission } from '../api';
import { Icons, TOKENS } from '../constants';
import { StarRating } from '../components/StarRating';

const SubmissionReview: React.FC = () => {
  const { cloudConfig, t } = useAppStore();
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [content, setContent] = useState<SubmissionContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudConfig.submissionId || !cloudConfig.token) {
      setError('Missing submission_id or token');
      setLoading(false);
      return;
    }

    getSubmission(cloudConfig.submissionId, cloudConfig.token)
      .then(sub => {
        setSubmission(sub);
        try {
          const parsed = typeof sub.content === 'string' ? JSON.parse(sub.content) : sub.content;
          setContent(parsed);
        } catch {
          setError('Failed to parse submission data');
        }
      })
      .catch(err => {
        console.error('[Review] Error fetching submission:', err);
        setError(t('noSubmission'));
      })
      .finally(() => setLoading(false));
  }, [cloudConfig.submissionId, cloudConfig.token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#08b8fb] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="text-center py-20">
        <Icons.CircleX />
        <p className={`${TOKENS.typography.lg} text-[#ef4444] mt-4`}>{error || t('noSubmission')}</p>
      </div>
    );
  }

  const scorePct = content.totalQuestions > 0
    ? Math.round((content.correctAnswers / content.totalQuestions) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className={`${TOKENS.typography.title} text-[#091e42]`}>{t('reviewSubmission')}</h1>
        {submission?.student_name && (
          <p className={`${TOKENS.typography.lg} text-[#6882a9]`}>
            {t('studentName')}: <span className="font-semibold text-[#091e42]">{submission.student_name}</span>
          </p>
        )}
        {content.quizTitle && (
          <p className={`${TOKENS.typography.base} text-[#6882a9]`}>{content.quizTitle}</p>
        )}
        {submission?.created_at && (
          <p className={`${TOKENS.typography.sm} text-[#6882a9]`}>
            {t('submittedAt')}: {new Date(submission.created_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Score Card */}
      <div className="text-center py-6">
        <h2 className={`${TOKENS.typography.display} ${scorePct >= 70 ? 'text-[#22c55e]' : scorePct >= 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
          {scorePct}%
        </h2>

        <div className="flex justify-center gap-6 mt-6 flex-wrap">
          <div className="text-center">
            <div className={`${TOKENS.typography.title} text-[#22c55e]`}>{content.correctAnswers}</div>
            <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('correct')}</div>
          </div>
          <div className="text-center">
            <div className={`${TOKENS.typography.title} text-[#ef4444]`}>{content.totalQuestions - content.correctAnswers}</div>
            <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('incorrect')}</div>
          </div>
          <div className="text-center">
            <div className={`${TOKENS.typography.title} text-[#091e42]`}>{content.totalQuestions}</div>
            <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('questions')}</div>
          </div>
        </div>

        {/* Gamification summary */}
        <div className="mt-6 p-6 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#f59e0b] mb-1">
                <Icons.Zap />
              </div>
              <div className={`${TOKENS.typography.xl} text-[#091e42]`}>{content.totalXP}</div>
              <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('totalXP')}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#ed3b91] mb-1">
                <Icons.Star filled size={20} />
              </div>
              <div className={`${TOKENS.typography.xl} text-[#091e42]`}>{content.totalStars}/{content.totalQuestions * 3}</div>
              <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('starsEarned')}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#08b8fb] mb-1">
                <Icons.Fire />
              </div>
              <div className={`${TOKENS.typography.xl} text-[#091e42]`}>{content.bestStreak}x</div>
              <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('streak')}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#a855f7] mb-1">
                <Icons.Zap />
              </div>
              <div className={`${TOKENS.typography.xl} text-[#091e42]`}>{content.level}</div>
              <div className={`${TOKENS.typography.sm} text-[#6882a9]`}>{t('level')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Question Review */}
      <div className="space-y-4">
        <h3 className={`${TOKENS.typography.xl} text-[#091e42]`}>{t('studentAnswers')}</h3>
        {content.questions.map((q, i) => {
          const stars = q.starsEarned || 0;
          const xp = q.xpEarned || 0;

          // Format student answer for display
          let displayAnswer = '';
          if (q.studentAnswer !== '' && q.studentAnswer != null) {
            if (Array.isArray(q.studentAnswer)) {
              if (q.type === 'multi_select' && q.options) {
                displayAnswer = (q.studentAnswer as number[]).map(idx => q.options![idx]).join(', ');
              } else {
                displayAnswer = String(q.studentAnswer);
              }
            } else if (typeof q.studentAnswer === 'object') {
              displayAnswer = Object.entries(q.studentAnswer).map(([k, v]) => `${k} = ${v}`).join(', ');
            } else if (q.type === 'mcq' && q.options && typeof q.studentAnswer === 'number') {
              displayAnswer = q.options[q.studentAnswer];
            } else if (q.type === 'true_false') {
              displayAnswer = q.studentAnswer ? t('true') : t('false');
            } else {
              displayAnswer = String(q.studentAnswer);
            }
          }

          return (
            <div
              key={i}
              className={`p-5 border rounded-xl ${q.correct ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-[#ef4444]/30 bg-[#ef4444]/5'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 ${q.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {q.correct ? <Icons.CircleCheck /> : <Icons.CircleX />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`${TOKENS.typography.base} font-medium text-[#091e42]`}>{q.question}</p>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {stars > 0 && <StarRating stars={stars} size={16} />}
                      {xp > 0 && (
                        <span className={`${TOKENS.typography.sm} text-[#f59e0b] font-bold`}>+{xp}</span>
                      )}
                    </div>
                  </div>
                  {displayAnswer && (
                    <p className={`${TOKENS.typography.sm} mt-1 ${q.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {t('yourAnswer')}: {displayAnswer}
                    </p>
                  )}
                  {!q.correct && (
                    <p className={`${TOKENS.typography.sm} mt-1 text-[#22c55e]`}>
                      {t('correctAnswerIs')}: {q.correctAnswer}
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
};

export default SubmissionReview;
