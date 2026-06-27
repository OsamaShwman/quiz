
import { SubmissionContent, SubmissionResponse } from './types';

export const STEAMHUB_API_BASE = 'https://api.steamhub.cloud';

export interface ArtifactResponse {
  id: number;
  artifact_data: string; // The stringified JSON
  [key: string]: any;
}

export const fetchArtifact = async (id: string, token: string): Promise<string> => {
  const url = `${STEAMHUB_API_BASE}/studio/artifacts/info/${id}/`;
  console.log(`[API] GET ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`[API] GET Error ${response.status}: ${response.statusText}`);
    throw new Error(`Failed to fetch artifact: ${response.statusText}`);
  }

  const json = await response.json();
  console.log('[API] GET Success, data length:', json.artifact_data?.length || 0);

  return json.artifact_data || json.data?.artifact_data || "";
};

export const updateArtifact = async (id: string, token: string, data: string) => {
  const url = `${STEAMHUB_API_BASE}/studio/artifacts/update/${id}/`;
  console.log(`[API] PUT ${url}`);
  // console.log('[API] Payload Preview:', data.substring(0, 100) + '...');

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      artifact_data: data
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] PUT Error ${response.status}:`, errorText);
    throw new Error(`Failed to update artifact: ${response.statusText}`);
  }

  const resJson = await response.json();
  console.log('[API] PUT Success:', resJson);
  return resJson;
};

// Student: submit quiz results
export const submitQuizResult = async (
  artifactId: string,
  token: string,
  content: SubmissionContent,
  score: number
): Promise<SubmissionResponse> => {
  const url = `${STEAMHUB_API_BASE}/organization/results/artifact/${artifactId}/submission/`;
  console.log(`[API] POST ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: JSON.stringify(content),
      score,
      status: 'completed',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] POST Submission Error ${response.status}:`, errorText);
    throw new Error(`Failed to submit results: ${response.statusText}`);
  }

  const json = await response.json();
  console.log('[API] POST Submission Success:', json);
  return json;
};

// Student: get own previous submission
export const getOwnSubmission = async (
  artifactId: string,
  token: string
): Promise<SubmissionResponse | null> => {
  const url = `${STEAMHUB_API_BASE}/organization/results/artifact/${artifactId}/submission/`;
  console.log(`[API] GET own submission ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    console.error(`[API] GET own submission Error ${response.status}: ${response.statusText}`);
    throw new Error(`Failed to fetch submission: ${response.statusText}`);
  }

  const json = await response.json();
  console.log('[API] GET own submission Success');
  return json;
};

// Student: fetch own level / XP / avatar from main platform
export interface StudentLevelInfo {
  level: number;
  xp: number;
  avatar: string;
}

export const getStudentLevel = async (token: string): Promise<StudentLevelInfo | null> => {
  const url = `${STEAMHUB_API_BASE}/profile/api/v1/me/level/`;
  console.log(`[API] GET ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[API] GET student level failed ${response.status}: ${response.statusText}`);
      return null;
    }

    const json = await response.json();
    if (json.success && json.data) {
      console.log('[API] GET student level success:', json.data);
      return json.data as StudentLevelInfo;
    }
    return null;
  } catch (err) {
    console.warn('[API] GET student level error:', err);
    return null;
  }
};

// Award XP to the student's main account.
// This calls our OWN Cloudflare Pages Function (/api/award-xp), which adds a
// shared secret header before forwarding to Steamhub. The secret never reaches
// the browser bundle.
//
// The Steamhub endpoint is idempotent on submission_id — sending the same
// submission_id twice returns { xp_added: 0, idempotent_replay: true }
// without double-crediting. This lets us retry freely on transient failures.
//
// Retry policy (per Steamhub partner docs):
//   - Retry on 5xx and network errors with exponential backoff
//   - Retry on 429 with backoff
//   - Do NOT retry on 4xx (they're bugs, not transient)
export interface AwardXPResult {
  success: boolean;
  xpAdded: number;       // how much XP the backend actually credited
  idempotentReplay: boolean; // true if this was a duplicate request
  error?: string;
  status?: number;
}

const AWARD_XP_MAX_ATTEMPTS = 3;
const AWARD_XP_BACKOFF_MS = [500, 1500, 3000]; // delays between attempts

export const awardXP = async (
  token: string,
  xp: number,
  meta: { quiz_id?: string; submission_id?: number; space_id?: number | string } = {}
): Promise<AwardXPResult> => {
  const url = `/api/award-xp`;
  const body = JSON.stringify({ xp, ...meta });

  for (let attempt = 0; attempt < AWARD_XP_MAX_ATTEMPTS; attempt++) {
    console.log(`[API] POST ${url} attempt ${attempt + 1}/${AWARD_XP_MAX_ATTEMPTS}`, { xp, ...meta });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });

      const json = await response.json().catch(() => ({} as any));

      if (response.ok) {
        // Expected success shape from Steamhub: { success: true, data: { xp_added, idempotent_replay, ... } }
        const data = json?.data || {};
        console.log('[API] award XP success:', data);
        return {
          success: true,
          xpAdded: typeof data.xp_added === 'number' ? data.xp_added : 0,
          idempotentReplay: data.idempotent_replay === true,
          status: response.status,
        };
      }

      // 4xx → don't retry (per Steamhub docs: "4xx errors are partner bugs, not transient")
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.warn(`[API] award XP failed ${response.status} (no retry):`, json);
        return {
          success: false,
          xpAdded: 0,
          idempotentReplay: false,
          error: json?.error || json?.error_code || json?.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      // 429 or 5xx → retryable
      console.warn(`[API] award XP retryable failure ${response.status}, attempt ${attempt + 1}`);
      if (attempt < AWARD_XP_MAX_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, AWARD_XP_BACKOFF_MS[attempt]));
        continue;
      }
      // Exhausted retries
      return {
        success: false,
        xpAdded: 0,
        idempotentReplay: false,
        error: json?.error || `HTTP ${response.status} after ${AWARD_XP_MAX_ATTEMPTS} attempts`,
        status: response.status,
      };
    } catch (err) {
      // Network error — safe to retry because the backend is idempotent
      console.warn(`[API] award XP network error, attempt ${attempt + 1}:`, err);
      if (attempt < AWARD_XP_MAX_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, AWARD_XP_BACKOFF_MS[attempt]));
        continue;
      }
      return {
        success: false,
        xpAdded: 0,
        idempotentReplay: false,
        error: String(err),
      };
    }
  }

  // Should be unreachable, but TypeScript wants a guaranteed return
  return { success: false, xpAdded: 0, idempotentReplay: false, error: 'Unknown' };
};

// Teacher: get a specific student's submission
export const getSubmission = async (
  submissionId: string,
  token: string
): Promise<SubmissionResponse> => {
  const url = `${STEAMHUB_API_BASE}/organization/results/submission/${submissionId}/`;
  console.log(`[API] GET submission ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`[API] GET submission Error ${response.status}: ${response.statusText}`);
    throw new Error(`Failed to fetch submission: ${response.statusText}`);
  }

  const json = await response.json();
  console.log('[API] GET submission Success');
  return json;
};
