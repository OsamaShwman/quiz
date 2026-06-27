/**
 * Cloudflare Pages Function: POST /api/gemini/generate
 *
 * Thin proxy around the Gemini generateContent API. The frontend builds the
 * full prompt (contents + config) and posts it here. This function adds the
 * server-side GEMINI_API_KEY (never exposed to the browser) and returns the
 * generated text.
 *
 * Request body shape:
 *   {
 *     model: string,
 *     contents: any[],  // Gemini "contents" array (text, fileData parts, etc.)
 *     config?: {
 *       systemInstruction?: string,
 *       responseMimeType?: string,
 *       responseSchema?: any,
 *     }
 *   }
 *
 * Response shape:
 *   { text: string }      on success
 *   { error: string }     on failure
 */

import { GoogleGenAI } from '@google/genai';

interface Env {
  GEMINI_API_KEY: string;
}

interface GenerateRequest {
  model?: string;
  contents: any[];
  config?: {
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const reqId = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = (request.headers.get('User-Agent') || '').slice(0, 80);

  console.log(`[gemini/generate][${reqId}] START ip=${clientIp} ua="${ua}"`);

  if (!env.GEMINI_API_KEY) {
    console.error(`[gemini/generate][${reqId}] FAIL reason=missing_api_key`);
    return jsonResponse({ error: 'Server misconfigured: GEMINI_API_KEY missing' }, 500);
  }

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch (err: any) {
    console.error(`[gemini/generate][${reqId}] FAIL reason=invalid_json_body msg="${err?.message}"`);
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body || !Array.isArray(body.contents) || body.contents.length === 0) {
    console.error(`[gemini/generate][${reqId}] FAIL reason=empty_contents`);
    return jsonResponse({ error: 'Missing contents array' }, 400);
  }

  const model = body.model || 'gemini-3-flash-preview';
  const contentsSummary = summarizeContents(body.contents);
  const sysInstrLen = (body.config?.systemInstruction || '').length;
  const hasSchema = !!body.config?.responseSchema;
  const reqBytes = JSON.stringify(body).length;

  console.log(
    `[gemini/generate][${reqId}] REQ model=${model} parts=${body.contents.length} ` +
    `textChars=${contentsSummary.textChars} fileRefs=${contentsSummary.fileRefs} ` +
    `sysInstrChars=${sysInstrLen} schema=${hasSchema} bodyBytes=${reqBytes}`
  );

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model,
      contents: body.contents,
      config: body.config,
    });

    const text = response.text || '';
    const candidate = (response as any)?.candidates?.[0];
    const finishReason = candidate?.finishReason || 'unknown';
    const safetyRatings = candidate?.safetyRatings || [];
    const usage = (response as any)?.usageMetadata || {};
    const duration = Date.now() - t0;

    console.log(
      `[gemini/generate][${reqId}] OK durationMs=${duration} finishReason=${finishReason} ` +
      `promptTokens=${usage.promptTokenCount ?? '?'} outputTokens=${usage.candidatesTokenCount ?? '?'} ` +
      `totalTokens=${usage.totalTokenCount ?? '?'} textChars=${text.length}`
    );

    if (finishReason && finishReason !== 'STOP') {
      console.warn(
        `[gemini/generate][${reqId}] WARN non_stop_finish reason=${finishReason} ` +
        `safety=${JSON.stringify(safetyRatings)} textPreview="${text.slice(0, 200).replace(/\n/g, ' ')}"`
      );
    }

    if (text.length === 0) {
      console.warn(`[gemini/generate][${reqId}] WARN empty_response_text finishReason=${finishReason}`);
    }

    return jsonResponse({ text });
  } catch (err: any) {
    const duration = Date.now() - t0;
    const status = err?.status || err?.response?.status || 'n/a';
    const code = err?.code || 'n/a';
    const msg = err?.message || String(err);
    const stack = (err?.stack || '').split('\n').slice(0, 5).join(' | ');

    console.error(
      `[gemini/generate][${reqId}] FAIL durationMs=${duration} status=${status} code=${code} ` +
      `msg="${msg}" stack="${stack}"`
    );

    return jsonResponse({ error: msg || 'Gemini call failed' }, 502);
  }
};

function summarizeContents(contents: any[]): { textChars: number; fileRefs: number } {
  let textChars = 0;
  let fileRefs = 0;
  for (const part of contents) {
    if (typeof part?.text === 'string') textChars += part.text.length;
    if (part?.fileData?.fileUri) fileRefs += 1;
  }
  return { textChars, fileRefs };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
