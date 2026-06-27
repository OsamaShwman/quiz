# Steamhub API Integration Guide

This document describes how the **String Quiz** app integrates with the
**Steamhub** platform, so the same pattern can be reused in any other app
(quiz, editor, simulation, game, lab, etc.) launched from a Steamhub space.

The whole integration is built on three ideas:

1. **An "artifact"** is a JSON blob stored on Steamhub. It holds whatever the
   teacher created (questions, code, design, scene). The app reads/writes
   this single string. Steamhub does not care about its shape.
2. **A "submission"** is a per-student JSON blob attached to an artifact.
   Holds the student's answers, score, status. One submission per student
   per artifact (the API is upsert-style on `POST`).
3. **The app receives credentials in the URL.** Steamhub launches the app in
   an iframe (or new tab) and passes `id`, `token`, `mode`, `submission_id`,
   `space_id` as query params. The app uses those to call Steamhub APIs
   directly from the browser with `Authorization: Bearer <token>`.

---

## 1. Base URL

```
https://api.steamhub.cloud
```

All endpoints below are appended to this base.

---

## 2. URL parameters Steamhub passes to your app

When Steamhub opens your app, it puts these on the URL (querystring **or** the
hash querystring — your code should check both):

| Param           | Required | Meaning                                                             |
| --------------- | -------- | ------------------------------------------------------------------- |
| `id`            | yes      | The artifact ID. The single piece of content this app instance owns |
| `token`         | yes      | Bearer JWT for the current Steamhub user                            |
| `mode`          | yes      | `teacher`, `student` (or `view`), or `editor`                       |
| `submission_id` | teacher  | When a teacher reviews one student's result, the submission row id  |
| `space_id`      | optional | The classroom/space the artifact belongs to                         |
| `lang`          | optional | `en` / `ar` (or whatever your app supports)                         |

Example launch URLs:

```
https://your-app.example/?id=12345&token=eyJhbGciOi...&mode=teacher&space_id=42
https://your-app.example/?id=12345&token=eyJhbGciOi...&mode=student
https://your-app.example/?id=12345&token=eyJhbGciOi...&mode=teacher&submission_id=987
```

> Read params from **both** `window.location.search` and the hash querystring
> (`window.location.hash.split('?')[1]`). Some hosts forward parameters as a
> hash to keep the iframe URL clean — see `store.tsx` for the helper.

Persist `id` + `token` to `localStorage` once you have them, so a hard refresh
without query params still works.

---

## 3. Artifact API (teacher's content)

This is the "save / load the document" pair. Use it for whatever JSON your
app produces.

### 3.1 Load — `GET /studio/artifacts/info/{id}/`

Used by the **teacher editor** to load an existing artifact, and by the
**student viewer** to load the published content.

```http
GET https://api.steamhub.cloud/studio/artifacts/info/{id}/
Authorization: Bearer {token}
Accept: application/json
```

**Response (relevant fields):**

```json
{
  "id": 12345,
  "artifact_data": "{\"title\":\"My Quiz\",\"questions\":[...]}"
}
```

`artifact_data` is **a JSON string** (not an object). Parse it client-side.
If it's empty, treat it as a brand-new document and initialize defaults.

### 3.2 Save — `PUT /studio/artifacts/update/{id}/`

Used by the **teacher editor** to save changes.

```http
PUT https://api.steamhub.cloud/studio/artifacts/update/{id}/
Authorization: Bearer {token}
Content-Type: application/json

{
  "artifact_data": "{\"title\":\"My Quiz\",\"questions\":[...]}"
}
```

Notes:

- `artifact_data` must be a **stringified** JSON, not a nested object.
- Steamhub overwrites the previous value. There is no merge / patch.
- A common pattern is debounced auto-save: each keystroke schedules
  `setTimeout(save, 800)` and clears the previous timer.
- The `id` in the URL is the artifact id; you do **not** include it in the body.

### Reference implementation

`api.ts` -> `fetchArtifact(id, token)` and `updateArtifact(id, token, data)`.

---

## 4. Submission API (student's results)

A submission is a per-student JSON document attached to an artifact. Used to
record the student's answers, score, and status.

### 4.1 Submit — `POST /organization/results/artifact/{artifactId}/submission/`

Used by the **student** when they finish.

```http
POST https://api.steamhub.cloud/organization/results/artifact/{artifactId}/submission/
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "{\"answers\":[...],\"correctAnswers\":7}",
  "score": 85,
  "status": "completed"
}
```

- `content` is a **stringified** JSON — put whatever you want here. The
  teacher review screen will parse it back.
- `score` is a number 0–100. Steamhub indexes/displays it.
- `status` is `"completed"` (or `"in_progress"` if you want to support
  resumable runs).
- This endpoint is upsert-style: posting again overwrites the same student's
  previous submission for this artifact.

### 4.2 Read own previous — `GET /organization/results/artifact/{artifactId}/submission/`

Used to detect **"the student has already finished — show their previous
result instead of restarting"**.

```http
GET https://api.steamhub.cloud/organization/results/artifact/{artifactId}/submission/
Authorization: Bearer {token}
```

- Returns the student's own submission row (same shape as the response of
  `POST`).
- Returns **404** when the student has no submission yet — treat that as
  "first attempt", not as an error.

### 4.3 Read a specific submission — `GET /organization/results/submission/{submissionId}/`

Used by the **teacher review screen** to display one student's submission.

```http
GET https://api.steamhub.cloud/organization/results/submission/{submissionId}/
Authorization: Bearer {token}
```

- The teacher arrives at your app with `?mode=teacher&submission_id=987`.
- Use `submission_id` from the URL with this endpoint.
- Returns `{ id, content, score, status, created_at, student_name, ... }`.
  Parse `content` (it's a stringified JSON) to render the per-question
  detail.

### Reference implementations

`api.ts` ->
`submitQuizResult(...)`, `getOwnSubmission(...)`, `getSubmission(...)`.

---

## 5. App role flow

The app behaves differently based on `mode`. In our app the routing is:

```
mode=teacher                               -> /edit   (artifact editor)
mode=teacher & submission_id present       -> /review (one student's result)
mode=student | view                        -> /view   (run the activity, then submit)
```

Three distinct screens, all sharing the same artifact id:

| Screen           | What it does                                              | APIs used                                       |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Editor           | Teacher creates/edits the content                         | `GET artifact`, `PUT artifact`                  |
| Viewer / Player  | Student plays the activity, sees previous result if any   | `GET artifact`, `GET own submission`, `POST submission` |
| Submission Review| Teacher inspects one student's run                        | `GET artifact`, `GET submission/{id}`           |

---

## 6. Authentication model

- Every request carries the launching user's JWT as
  `Authorization: Bearer <token>`.
- The app does **not** call any login endpoints. Steamhub already
  authenticated the user before launching the app and just hands you the
  token in the URL.
- Treat the token as opaque. Do not decode it client-side for permission
  decisions — Steamhub enforces permissions server-side. The role you
  trust is the `mode` URL param **plus** what the API allows that token to
  do (e.g., a student token won't be allowed to PUT another teacher's
  artifact even if your UI lets them try).

---

## 7. Minimal client recipe (any framework)

```ts
const BASE = 'https://api.steamhub.cloud';

// 1. Read launch params (search + hash both)
const params = new URLSearchParams(
  window.location.search +
  (window.location.hash.includes('?') ? '&' + window.location.hash.split('?')[1] : '')
);
const id           = params.get('id')!;
const token        = params.get('token')!;
const mode         = params.get('mode');           // 'teacher' | 'student' | 'view'
const submissionId = params.get('submission_id');  // teacher review only

const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

// 2. Load artifact (teacher editor + student viewer)
const artifact = await fetch(`${BASE}/studio/artifacts/info/${id}/`, { headers: auth })
  .then(r => r.json());
const doc = artifact.artifact_data ? JSON.parse(artifact.artifact_data) : {};

// 3. Save artifact (teacher only)
await fetch(`${BASE}/studio/artifacts/update/${id}/`, {
  method: 'PUT',
  headers: auth,
  body: JSON.stringify({ artifact_data: JSON.stringify(doc) }),
});

// 4. Submit student result
await fetch(`${BASE}/organization/results/artifact/${id}/submission/`, {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({
    content: JSON.stringify({ /* whatever per-student data you keep */ }),
    score: 85,
    status: 'completed',
  }),
});

// 5. Get my own previous submission (404 = none yet)
const ownRes = await fetch(`${BASE}/organization/results/artifact/${id}/submission/`, { headers: auth });
const ownSubmission = ownRes.status === 404 ? null : await ownRes.json();

// 6. Teacher: read one student's submission by submission_id
const sub = await fetch(`${BASE}/organization/results/submission/${submissionId}/`, { headers: auth })
  .then(r => r.json());
const studentContent = JSON.parse(sub.content);
```

That's the entire integration. Everything else (debounced save, retry on
network errors, role-based routing) is layered on top of these five calls.

---

## 8. Endpoint cheat-sheet

| Method | Path                                                              | Who        | Purpose                              |
| ------ | ----------------------------------------------------------------- | ---------- | ------------------------------------ |
| GET    | `/studio/artifacts/info/{id}/`                                    | both       | Load artifact JSON                   |
| PUT    | `/studio/artifacts/update/{id}/`                                  | teacher    | Save artifact JSON                   |
| POST   | `/organization/results/artifact/{id}/submission/`                 | student    | Submit / overwrite own result        |
| GET    | `/organization/results/artifact/{id}/submission/`                 | student    | Read own previous result (404 = none)|
| GET    | `/organization/results/submission/{submissionId}/`                | teacher    | Read one specific student submission |

All endpoints use `Authorization: Bearer <token>`. No other auth headers,
secrets, or app-level credentials are needed for the core artifact +
submission flow.
