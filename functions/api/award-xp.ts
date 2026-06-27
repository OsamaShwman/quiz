/**
 * Cloudflare Pages Function: POST /api/award-xp
 *
 * Server-side proxy that forwards an XP award request to the Steamhub backend.
 * Adds a SHARED SECRET HEADER so the Steamhub backend knows the request came
 * from this quiz app (not a hand-crafted request from a random client).
 *
 * Secrets used (set in Cloudflare Pages → Settings → Environment variables):
 *   STEAMHUB_APP_SECRET   - shared secret known only to this app and Steamhub
 *   STEAMHUB_API_BASE     - (optional) override base URL, defaults to https://api.steamhub.cloud
 *
 * Request from frontend (browser):
 *   POST /api/award-xp
 *   Authorization: Bearer <student JWT>
 *   Content-Type: application/json
 *   Body: { xp: number, source?: string, quiz_id?: string, submission_id?: number }
 *
 * The student's JWT is forwarded as-is so Steamhub still authenticates the user.
 * The shared secret tells Steamhub "this came from the official quiz app".
 */

interface Env {
  STEAMHUB_APP_SECRET: string;
  STEAMHUB_API_BASE?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Require the student JWT (passed through from the browser)
  const auth = request.headers.get('Authorization');
  if (!auth) {
    return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401);
  }

  // 2. Require the shared secret to be configured (server-side guard)
  if (!env.STEAMHUB_APP_SECRET) {
    console.error('[award-xp] STEAMHUB_APP_SECRET not configured');
    return jsonResponse({ success: false, error: 'Server misconfigured' }, 500);
  }

  // 3. Parse and validate body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (typeof body?.xp !== 'number' || body.xp <= 0 || body.xp > 100000) {
    return jsonResponse({ success: false, error: 'Invalid xp value' }, 400);
  }

  // 4. Forward to Steamhub with the shared secret added
  const base = env.STEAMHUB_API_BASE || 'https://api.steamhub.cloud';
  const targetUrl = `${base}/profile/api/v1/me/xp/award/`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Shared secret — proves this request originated from the quiz app
        'X-App-Secret': env.STEAMHUB_APP_SECRET,
        'X-App-Source': 'string-quiz',
      },
      body: JSON.stringify({
        xp: body.xp,
        quiz_id: body.quiz_id,
        submission_id: body.submission_id,
        space_id: body.space_id,
      }),
    });

    const text = await upstream.text();
    // Pass the upstream response through transparently
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[award-xp] upstream call failed:', err);
    return jsonResponse({ success: false, error: 'Upstream request failed' }, 502);
  }
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
