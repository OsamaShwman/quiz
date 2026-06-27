
import { Question, QuestionDifficulty } from "./types";

// Local Type constants matching @google/genai's Type enum string values.
// Used in responseSchema definitions. We send these as plain strings over the
// wire to our Pages Function, which forwards them to Gemini.
const Type = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
  NUMBER: 'NUMBER',
} as const;

// Helper: call our Pages Function instead of Gemini directly.
// The function adds the GEMINI_API_KEY server-side and forwards to Gemini.
async function callGenerate(payload: {
  model?: string;
  contents: any[];
  config?: any;
}): Promise<{ text: string }> {
  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(json?.error || `Gemini proxy returned ${res.status}`);
  }
  return { text: (json as any).text || '' };
}

// Helper: upload a file via our Pages Function. Returns the Gemini file URI
// + mime type, which can then be referenced from contents[].fileData.
async function callUpload(file: File): Promise<{ uri: string; mimeType: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/gemini/upload', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error((json as any)?.error || `Gemini upload returned ${res.status}`);
  }
  return { uri: (json as any).uri, mimeType: (json as any).mimeType };
}

export interface GeneratedQuiz {
  title: string;
  questions: Question[];
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'super_hard' | 'mixed';
export type ImproveAction = 'rephrase' | 'fix_grammar' | 'easier' | 'harder';

/**
 * Generate a short hint for a question that nudges the student in the right
 * direction WITHOUT revealing the actual answer.
 */
export const getQuestionHint = async (question: Question): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `
      You are a teacher helping a student who is stuck on a quiz question.
      Generate ONE short hint (1-2 sentences) that nudges the student toward the correct answer WITHOUT revealing it.
      Rules:
      - Do NOT state or imply the actual correct answer.
      - Do NOT name the correct option letter or text.
      - Do NOT eliminate options for them.
      - Focus on what concept or strategy the student should think about.
      - Match the language of the question (Arabic for Arabic, English for English).
      - Keep it short and friendly.
      Return ONLY the hint text, no JSON, no quotes, no preamble.
    `;

    let q = `Question: ${question.question}`;
    if (question.type === 'mcq') {
      q += `\nOptions: ${question.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(' | ')}`;
    } else if (question.type === 'multi_select') {
      q += `\nOptions: ${question.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(' | ')}`;
    } else if (question.type === 'matching') {
      q += `\nLeft items: ${question.pairs.map(p => p.left).join(', ')}\nRight items: ${question.pairs.map(p => p.right).join(', ')}`;
    }

    const response = await callGenerate({
      model,
      contents: [{ text: q }],
      config: { systemInstruction },
    });

    return (response.text || '').trim();
  } catch (err) {
    console.error('Error generating hint:', err);
    throw err;
  }
};

const COMMON_RULES = `
  LANGUAGE & MATH RULES:
  - Detect the language of the source. The output MUST be in the SAME language as the source.

  - MATH DELIMITERS: For any mathematical expression, equation, formula, variable, or scientific notation, wrap it with $$ ... $$ on both sides. Example: $$x^2 + y^2 = r^2$$ or $$\\\\text{H}_2\\\\text{O}$$. Do NOT use single dollar signs $...$ (would conflict with currency). Do NOT use \\\\(...\\\\) or \\\\[...\\\\]. ONLY $$...$$.

  - JSON BACKSLASH ESCAPING (CRITICAL): When you write LaTeX commands inside a JSON string value, you MUST write every backslash as TWO backslashes \\\\, because JSON parses \\\\ as one backslash. If you write a single backslash, the parser will treat \\\\t as a tab character, \\\\r as a newline, and the LaTeX command will be destroyed.
    Examples of CORRECT JSON output (note the doubled backslashes):
      "question": "ما قيمة $$\\\\text{H}_2\\\\text{O}$$ في التفاعل؟"
      "question": "Solve $$\\\\frac{1}{2} + \\\\frac{1}{3}$$"
      "question": "If $$x \\\\rightarrow \\\\infty$$ then..."
    Examples of WRONG JSON output (these will be CORRUPTED):
      "question": "ما قيمة $$\\text{H}_2$$ ..."   ← \\text becomes a tab
      "question": "If $$x \\rightarrow \\infty$$" ← \\r becomes a newline

  - Only wrap content in $$ if it is actually mathematical. Plain text should NOT be wrapped.
  - PREFER UNICODE characters when possible: use → not $$\\\\rightarrow$$, use × not $$\\\\times$$, use ² ³ for simple powers, use ½ ⅓ ¼ for simple fractions, use π α β γ for Greek letters. Reserve $$...$$ LaTeX for things Unicode can't express (fractions like \\\\frac{a+b}{c-d}, integrals, summations, complex chemistry).

  - NEVER reference the source text - do NOT use phrases like "According to the text", "Based on the passage", "The text states", "mentioned in the lesson", or their Arabic equivalents like "وفقا للنص", "حسب النص", "بحسب الدرس", "ذكر في النص". Students will NOT have the source material.
`;

export const generateQuizQuestions = async (
  input: string | File | File[],
  existingQuestions: Question[] = [],
  questionCount: number = 10,
  difficulty: Difficulty = 'mixed'
): Promise<GeneratedQuiz> => {
  try {
    const model = 'gemini-3-flash-preview';

    const difficultyGuide = {
      easy: 'Generate EASY questions: focus on basic recall, simple definitions, and straightforward facts. Avoid tricky wording or complex reasoning.',
      medium: 'Generate MEDIUM difficulty questions: test understanding and application of concepts. Include some questions that require connecting ideas.',
      hard: 'Generate HARD questions: test deep understanding, analysis, and critical thinking. Include questions that require reasoning, comparison, or applying concepts to new situations.',
      super_hard: 'Generate SUPER HARD questions: focus on the deepest, most advanced and most subtle details from the source material. Test multi-step reasoning, fine-grained distinctions, edge cases, exceptions, hidden implications, and the connection between multiple concepts that appear in different parts of the source. Distractors should be highly plausible and require careful thinking to eliminate. CRITICAL: Every super-hard question MUST be derived strictly from facts, examples, details, or concepts that appear EXPLICITLY in the source material the teacher provided. Do NOT invent advanced topics, do NOT pull from outside knowledge, do NOT add information that is not in the source. If the source material is too simple to support super-hard questions on a topic, focus on fine details, exact wording, exceptions, or combinations of facts that ARE present in the source rather than inventing harder content.',
      mixed: 'Generate a MIX of difficulties: roughly 30% easy (basic recall), 40% medium (understanding), and 30% hard (analysis/application).',
    };

    const systemInstruction = `
      You are an expert teacher and assessment designer. You must generate accurate, high-quality quiz questions.
      Your task is to analyze the provided content (text, document, or image - possibly multiple files) and generate a quiz.

      MANDATORY MULTI-PASS PROCESS:
      You MUST follow these steps internally before producing the final JSON:

      STEP 1 - DEEP READ:
      Read the entire source content carefully (across ALL provided files if multiple). Identify the key facts, definitions, relationships, and concepts. Pay attention to small details (numbers, names, dates, exact wording, edge cases) because small details often make the difference between a correct and incorrect answer.

      STEP 2 - DRAFT QUESTIONS:
      Generate the requested number of draft questions covering the most important content across all sources.

      STEP 3 - SELF-VERIFICATION (CRITICAL):
      For EACH draft question, perform this verification against the source content:
      a) Locate the EXACT passage, sentence, or visual element in the source that supports the answer.
      b) Re-read that passage carefully and confirm the answer is 100% supported by it.
      c) For MCQ/multi_select: verify each WRONG option is actually wrong according to the source. A wrong option that is accidentally also true is a critical failure.
      d) For true_false: verify the statement matches the source word-for-word in meaning, not just roughly. A small detail change (a number, a qualifier like "always/never", a name) can flip the truth value.
      e) For fill_blank: confirm the accepted answers exactly match what the source says.
      f) For matching: verify each left-right pair is explicitly stated or directly implied in the source.
      g) If you cannot locate clear support in the source, OR if there is any ambiguity, DISCARD that question and replace it with a different one you can fully verify.

      STEP 4 - FINAL CHECK:
      Before returning the JSON, scan one more time for:
      - Subtle factual errors caused by overlooked details
      - Questions that depend on assumptions not in the source
      - Wrong-but-plausible distractors that are actually correct
      - Off-by-one errors in correctIndex or correctIndices

      ACCURACY IS THE TOP PRIORITY:
      - Every answer field (correctIndex, correctAnswer, correctIndices, acceptedAnswers, pairs) MUST be verifiable from the source content.
      - For MCQ: correctIndex must point to the actually correct option in the options array (0-indexed).
      - For multi_select: correctIndices must list ALL indices of correct options, not just one.
      - For true_false: correctAnswer must be the actual truth value of the statement, considering every word.
      - For fill_blank: acceptedAnswers must include all reasonable correct spellings/forms.
      - For matching: each pair must be a genuinely correct match.
      - If you are unsure about a fact after verification, DO NOT include that question. Better to return fewer high-quality questions than questions with mistakes.
      ${COMMON_RULES}

      QUESTION-TYPE Rules:
      1. Focus ONLY on the subject matter and key knowledge within the content.
      2. Every question MUST be specific and self-contained.
      3. Generate a MIX of question types:
         - "mcq": Multiple choice with exactly 4 options and a correctIndex (0-3). All wrong options must be plausible but clearly wrong.
         - "true_false": A clear statement that is unambiguously true or false, with correctAnswer (boolean). Avoid vague or debatable statements.
         - "fill_blank": A sentence with "___" for the blank, with acceptedAnswers array (include multiple valid spellings, abbreviations, and forms) and caseSensitive (usually false).
         - "matching": A set of 3-5 pairs to match, each with left and right. All pairs must be distinct and unambiguous.
         - "multi_select": Multiple choice where 2 or more options are correct, with options array (4-5 options) and correctIndices array. There MUST be at least 2 correct options.
      4. Generate exactly ${questionCount} questions.
      5. Aim for roughly: 30% MCQ, 15% True/False, 15% Fill-blank, 15% Matching, 25% Multi-Select
      6. ${difficultyGuide[difficulty]}
      7. EVERY question MUST have a "difficulty" field set to one of: "easy", "medium", "hard", "super_hard". Set it accurately based on the cognitive load required.
      8. EVERY question MUST have a "hint" field: a short 1-2 sentence hint (max 200 chars) that helps a stuck student WITHOUT revealing the correct answer. Do NOT name the correct option, do NOT eliminate options, do NOT state or imply the answer. Focus on what concept or strategy the student should think about. Match the language of the question.
      9. Generate a short, descriptive title for the quiz based on the content topic.
      10. For matching questions, the "question" field should be an instruction like "Match the following terms with their definitions" (in the content's language).
      11. For fill_blank questions, use "___" in the question to indicate where the blank is.
      12. Return ONLY the JSON object.
    `;

    const contents: any[] = [];

    // Normalize input into array of files OR a single text item
    const files: File[] = Array.isArray(input)
      ? input
      : input instanceof File
        ? [input]
        : [];

    if (files.length > 0) {
      for (const f of files) {
        const uploadedFile = await callUpload(f);
        contents.push({
          fileData: {
            fileUri: uploadedFile.uri,
            mimeType: uploadedFile.mimeType,
          },
        });
      }
      contents.push({
        text: files.length > 1
          ? `Generate quiz questions from these ${files.length} documents. Treat them as a unified body of source material.`
          : "Generate quiz questions from this document.",
      });
    } else if (typeof input === 'string') {
      contents.push({ text: input });
    }

    if (existingQuestions.length > 0) {
      const existingList = existingQuestions.map((q, i) => {
        let detail = `${i + 1}. [${q.type}] ${q.question}`;
        if (q.type === 'mcq' && 'options' in q && q.options) {
          detail += `\n   Options: ${q.options.join(' | ')}`;
          if ('correctIndex' in q) detail += `\n   Answer: ${q.options[q.correctIndex]}`;
        } else if (q.type === 'multi_select' && 'options' in q && q.options) {
          detail += `\n   Options: ${q.options.join(' | ')}`;
          if ('correctIndices' in q && q.correctIndices) {
            detail += `\n   Answers: ${q.correctIndices.map(idx => q.options[idx]).join(', ')}`;
          }
        } else if (q.type === 'true_false' && 'correctAnswer' in q) {
          detail += `\n   Answer: ${q.correctAnswer}`;
        } else if (q.type === 'fill_blank' && 'acceptedAnswers' in q && q.acceptedAnswers) {
          detail += `\n   Answer: ${q.acceptedAnswers.join(' / ')}`;
        } else if (q.type === 'matching' && 'pairs' in q && q.pairs) {
          detail += `\n   Pairs: ${q.pairs.map(p => `${p.left} = ${p.right}`).join(' | ')}`;
        }
        return detail;
      }).join('\n\n');
      contents.push({
        text: `\n\nThe following ${existingQuestions.length} questions ALREADY EXIST in this quiz. You MUST generate NEW questions that:\n- Do NOT repeat any of these questions (even with different wording)\n- Do NOT test the same fact, concept, or knowledge point as any existing question\n- Cover DIFFERENT aspects of the source content than what is already covered\n- If the source content is mostly already covered, focus on details, edge cases, applications, or deeper aspects that haven't been tested yet\n\nEXISTING QUESTIONS:\n${existingList}`
      });
    }

    const response = await callGenerate({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['mcq', 'true_false', 'fill_blank', 'matching', 'multi_select'] },
                  question: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard', 'super_hard'] },
                  hint: { type: Type.STRING },
                  // MCQ fields
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  // Multi-select fields
                  correctIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  // True/False fields
                  correctAnswer: { type: Type.BOOLEAN },
                  // Fill-blank fields
                  acceptedAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  caseSensitive: { type: Type.BOOLEAN },
                  // Matching fields
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        left: { type: Type.STRING },
                        right: { type: Type.STRING }
                      },
                      required: ["left", "right"]
                    }
                  }
                },
                required: ["type", "question"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      const questions: Question[] = (result.questions || []).map((q: any, idx: number) => {
        const id = `ai_${Date.now()}_${idx}`;
        const meta = {
          difficulty: (q.difficulty as QuestionDifficulty) || undefined,
          hint: q.hint || undefined,
        };
        switch (q.type) {
          case 'mcq':
            return {
              id,
              type: 'mcq' as const,
              question: q.question,
              options: (q.options || ['', '', '', '']).slice(0, 4) as [string, string, string, string],
              correctIndex: (q.correctIndex ?? 0) as 0 | 1 | 2 | 3,
              ...meta,
            };
          case 'true_false':
            return {
              id,
              type: 'true_false' as const,
              question: q.question,
              correctAnswer: q.correctAnswer ?? true,
              ...meta,
            };
          case 'fill_blank':
            return {
              id,
              type: 'fill_blank' as const,
              question: q.question,
              acceptedAnswers: q.acceptedAnswers || [''],
              caseSensitive: q.caseSensitive ?? false,
              ...meta,
            };
          case 'matching':
            return {
              id,
              type: 'matching' as const,
              question: q.question,
              pairs: (q.pairs || []).slice(0, 6),
              ...meta,
            };
          case 'multi_select':
            return {
              id,
              type: 'multi_select' as const,
              question: q.question,
              options: q.options || ['', '', '', ''],
              correctIndices: q.correctIndices || [0],
              ...meta,
            };
          default:
            return {
              id,
              type: 'mcq' as const,
              question: q.question,
              options: ['', '', '', ''] as [string, string, string, string],
              correctIndex: 0 as const,
              ...meta,
            };
        }
      });

      return { title: result.title || '', questions };
    }

    return { title: '', questions: [] };

  } catch (error) {
    console.error("Error generating quiz questions:", error);
    throw error;
  }
};

const ACTION_GUIDE: Record<ImproveAction, string> = {
  rephrase: 'Rewrite the question with clearer, more natural wording while keeping the same meaning, same difficulty, and same correct answer. The new question must test the SAME concept and have the SAME correct answer.',
  fix_grammar: 'Fix any grammar, spelling, or punctuation issues in the question and any options/pairs/answers. Do NOT change the meaning, difficulty, or correct answer.',
  easier: 'Make this question easier by simplifying the wording, making distractors more obviously wrong, or testing a more basic version of the same concept. Keep the same question type and topic. The correct answer may change but should remain accurate.',
  harder: 'Make this question harder by adding more plausible distractors, requiring deeper understanding, or testing a more nuanced aspect of the same concept. Keep the same question type and topic. The correct answer may change but should remain accurate.',
};

export const improveQuestion = async (
  question: Question,
  action: ImproveAction
): Promise<Question> => {
  try {
    const model = 'gemini-3-flash-preview';

    const systemInstruction = `
      You are an expert teacher improving a single quiz question.
      ${ACTION_GUIDE[action]}

      ${COMMON_RULES}

      You MUST return a JSON object with the same structure as the input question, including the "type" field. Keep the same question type. Verify the correct answer is accurate before returning.

      ALSO include an updated "hint" field: a 1-2 sentence hint (max 200 chars) that helps a stuck student WITHOUT revealing the correct answer. Match the language of the question. Do NOT name the correct option, do NOT eliminate options, do NOT state the answer.
    `;

    let questionDescription = `Type: ${question.type}\nQuestion: ${question.question}`;
    if (question.type === 'mcq') {
      questionDescription += `\nOptions: ${question.options.join(' | ')}\nCorrect Index: ${question.correctIndex} (${question.options[question.correctIndex]})`;
    } else if (question.type === 'multi_select') {
      questionDescription += `\nOptions: ${question.options.join(' | ')}\nCorrect Indices: ${question.correctIndices.join(', ')}`;
    } else if (question.type === 'true_false') {
      questionDescription += `\nCorrect Answer: ${question.correctAnswer}`;
    } else if (question.type === 'fill_blank') {
      questionDescription += `\nAccepted Answers: ${question.acceptedAnswers.join(' / ')}`;
    } else if (question.type === 'matching') {
      questionDescription += `\nPairs: ${question.pairs.map(p => `${p.left} = ${p.right}`).join(' | ')}`;
    }

    const response = await callGenerate({
      model: model,
      contents: [{ text: questionDescription }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['mcq', 'true_false', 'fill_blank', 'matching', 'multi_select'] },
            question: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard', 'super_hard'] },
            hint: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            correctIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            correctAnswer: { type: Type.BOOLEAN },
            acceptedAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
            caseSensitive: { type: Type.BOOLEAN },
            pairs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  left: { type: Type.STRING },
                  right: { type: Type.STRING }
                },
                required: ["left", "right"]
              }
            }
          },
          required: ["type", "question"]
        }
      }
    });

    if (!response.text) return question;
    const q = JSON.parse(response.text);

    // Preserve original id and sourceCitation; merge new content
    const base = {
      id: question.id,
      sourceCitation: question.sourceCitation,
      difficulty: q.difficulty || question.difficulty,
      hint: q.hint || question.hint,
    };

    switch (question.type) {
      case 'mcq':
        return {
          ...base,
          type: 'mcq' as const,
          question: q.question || question.question,
          options: ((q.options || question.options).slice(0, 4)) as [string, string, string, string],
          correctIndex: (q.correctIndex ?? question.correctIndex) as 0 | 1 | 2 | 3,
        };
      case 'true_false':
        return {
          ...base,
          type: 'true_false' as const,
          question: q.question || question.question,
          correctAnswer: q.correctAnswer ?? question.correctAnswer,
        };
      case 'fill_blank':
        return {
          ...base,
          type: 'fill_blank' as const,
          question: q.question || question.question,
          acceptedAnswers: q.acceptedAnswers || question.acceptedAnswers,
          caseSensitive: q.caseSensitive ?? question.caseSensitive,
        };
      case 'matching':
        return {
          ...base,
          type: 'matching' as const,
          question: q.question || question.question,
          pairs: q.pairs || question.pairs,
        };
      case 'multi_select':
        return {
          ...base,
          type: 'multi_select' as const,
          question: q.question || question.question,
          options: q.options || question.options,
          correctIndices: q.correctIndices || question.correctIndices,
        };
    }
  } catch (error) {
    console.error("Error improving question:", error);
    throw error;
  }
};
