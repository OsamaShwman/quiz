
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GeneratedQuiz {
  title: string;
  questions: Question[];
}

export const generateQuizQuestions = async (
  input: string | File,
  existingQuestions: Question[] = []
): Promise<GeneratedQuiz> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      You are an expert teacher and assessment designer.
      Your task is to analyze the provided content (text, document, or image) and generate a high-quality quiz with a mix of question types.

      CRITICAL Rules:
      1. Detect the language of the provided content. The output MUST be in the SAME language as the source content.
      2. Focus ONLY on the subject matter and key knowledge within the content.
      3. Every question MUST be specific and self-contained.
      4. Generate a MIX of question types:
         - "mcq": Multiple choice with exactly 4 options and a correctIndex (0-3)
         - "true_false": A statement that is clearly true or false, with correctAnswer (boolean)
         - "fill_blank": A sentence with a blank, with acceptedAnswers array (multiple valid spellings) and caseSensitive (usually false)
         - "matching": A set of 3-6 pairs to match, each with left and right
         - "multi_select": Multiple choice where multiple options can be correct, with options array and correctIndices (array of correct option indices)
      5. Create 8 to 15 questions depending on the amount of content.
      6. Aim for roughly: 30% MCQ, 15% True/False, 15% Fill-blank, 15% Matching, 25% Multi-Select
      7. Questions should test understanding, not just recall.
      8. Generate a short, descriptive title for the quiz based on the content topic. The title must be in the same language as the content.
      9. For matching questions, the "question" field should be an instruction like "Match the following terms with their definitions" (in the content's language).
      10. For fill_blank questions, use "___" in the question to indicate where the blank is.
      11. Return ONLY the JSON object.
    `;

    const contents = [];

    if (input instanceof File) {
      const uploadedFile = await ai.files.upload({
        file: input,
        config: { mimeType: input.type },
      });
      contents.push({
        fileData: {
          fileUri: uploadedFile.uri!,
          mimeType: uploadedFile.mimeType!,
        },
      });
      contents.push({ text: "Generate quiz questions from this document." });
    } else {
      contents.push({ text: input });
    }

    if (existingQuestions.length > 0) {
      const existingList = existingQuestions.map(q => `Q: ${q.question}`).join('\n');
      contents.push({ text: `\n\nThe following questions already exist. Do NOT generate questions that cover the same topics:\n${existingList}` });
    }

    const response = await ai.models.generateContent({
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
        switch (q.type) {
          case 'mcq':
            return {
              id,
              type: 'mcq' as const,
              question: q.question,
              options: (q.options || ['', '', '', '']).slice(0, 4) as [string, string, string, string],
              correctIndex: (q.correctIndex ?? 0) as 0 | 1 | 2 | 3,
            };
          case 'true_false':
            return {
              id,
              type: 'true_false' as const,
              question: q.question,
              correctAnswer: q.correctAnswer ?? true,
            };
          case 'fill_blank':
            return {
              id,
              type: 'fill_blank' as const,
              question: q.question,
              acceptedAnswers: q.acceptedAnswers || [''],
              caseSensitive: q.caseSensitive ?? false,
            };
          case 'matching':
            return {
              id,
              type: 'matching' as const,
              question: q.question,
              pairs: (q.pairs || []).slice(0, 6),
            };
          case 'multi_select':
            return {
              id,
              type: 'multi_select' as const,
              question: q.question,
              options: q.options || ['', '', '', ''],
              correctIndices: q.correctIndices || [0],
            };
          default:
            return {
              id,
              type: 'mcq' as const,
              question: q.question,
              options: ['', '', '', ''] as [string, string, string, string],
              correctIndex: 0 as const,
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
