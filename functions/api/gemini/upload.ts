/**
 * Cloudflare Pages Function: POST /api/gemini/upload
 *
 * Receives a multipart upload from the browser, forwards it to the Gemini
 * Files API using the server-side GEMINI_API_KEY (never exposed to the
 * browser), and returns the resulting file URI + mime type.
 *
 * The frontend then includes that URI in subsequent /api/gemini/generate
 * calls as fileData.fileUri.
 */

import { GoogleGenAI } from '@google/genai';

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const reqId = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

  console.log(`[gemini/upload][${reqId}] START ip=${clientIp}`);

  if (!env.GEMINI_API_KEY) {
    console.error(`[gemini/upload][${reqId}] FAIL reason=missing_api_key`);
    return jsonResponse({ error: 'Server misconfigured: GEMINI_API_KEY missing' }, 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err: any) {
    console.error(`[gemini/upload][${reqId}] FAIL reason=invalid_multipart msg="${err?.message}"`);
    return jsonResponse({ error: 'Invalid multipart body' }, 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    console.error(`[gemini/upload][${reqId}] FAIL reason=no_file_field`);
    return jsonResponse({ error: 'Missing "file" field' }, 400);
  }

  const fileName = (file as File).name || 'unnamed';
  const fileSize = (file as File).size;
  const fileType = (file as File).type || 'application/octet-stream';

  console.log(
    `[gemini/upload][${reqId}] REQ name="${fileName}" size=${fileSize} mime=${fileType}`
  );

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const uploaded = await ai.files.upload({
      file,
      config: { mimeType: fileType },
    });

    const state = (uploaded as any)?.state || 'unknown';
    const name = (uploaded as any)?.name || 'unknown';
    const duration = Date.now() - t0;

    console.log(
      `[gemini/upload][${reqId}] OK durationMs=${duration} name=${name} state=${state} ` +
      `uri=${uploaded.uri} mime=${uploaded.mimeType}`
    );

    if (state && state !== 'ACTIVE') {
      console.warn(
        `[gemini/upload][${reqId}] WARN file_not_active state=${state} ` +
        `(generate call may fail if used before file becomes ACTIVE)`
      );
    }

    return jsonResponse({
      uri: uploaded.uri,
      mimeType: uploaded.mimeType,
    });
  } catch (err: any) {
    const duration = Date.now() - t0;
    const status = err?.status || err?.response?.status || 'n/a';
    const code = err?.code || 'n/a';
    const msg = err?.message || String(err);
    const stack = (err?.stack || '').split('\n').slice(0, 5).join(' | ');

    console.error(
      `[gemini/upload][${reqId}] FAIL durationMs=${duration} status=${status} code=${code} ` +
      `file="${fileName}" size=${fileSize} mime=${fileType} msg="${msg}" stack="${stack}"`
    );

    return jsonResponse({ error: msg || 'Upload failed' }, 502);
  }
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
