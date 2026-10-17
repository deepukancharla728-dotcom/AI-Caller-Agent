# CareConnect AI — Guardian Support Prototype

CareConnect AI is a fictional-data demo built with React 18, Vite 6 and Express 4. It demonstrates a guardian-support dashboard and optional voice APIs. It is **not an emergency service, a clinical product, or a student information system**.

## Safety and privacy limits

- Keep the on-screen prototype warning visible. Keyword detection is unreliable: it can miss an emergency or flag ordinary speech. Do not rely on it for safety.
- In India, call **112 in immediate danger**. Do not wait for this application, a model, or a guardian notification.
- Use only fictional records and fictional phone numbers. Do not enter real student, guardian, caller, or health information until a qualified privacy/compliance review and appropriate identity, consent, retention, and access controls are in place.
- Logs are in memory only. They disappear when the process restarts or Render sleeps/restarts. The free plan can sleep when idle. This repository does not configure durable storage.
- The fixed demo OTP is `123456`, and no SMS is sent. The server verifies it, applies expiry/attempt limits, and issues a signed, HttpOnly session cookie. **This is not real authentication or identity verification:** anyone who knows the public demo code can sign in. Never connect live calling or sensitive data to this demo login.
- Browser speech recognition may be handled by the browser/vendor. Do not speak real personal information into it.
- Live calls are disabled by default. Twilio requires an eligible account, billing, regional permissions, consent, and a public HTTPS webhook. Verify availability and applicable rules with Twilio before enabling it.
- API keys belong in server environment variables only. Do not put them in client code, commit them, or share them.

## Included features

- Fictional directory of 250 students, searchable and filterable by section, attendance, and demo guardian.
- Health banner for Gemini and Twilio configuration; server-side scripted fallbacks when providers are absent.
- Demo call panel with visible AI reply captions, optional browser voice, configurable speech language, microphone status, and a Stop control.
- Server-side rule-based escalation explanation, explicit confirmation before an outbound guardian notification, cooldown/hourly limits, and notification outcomes (`queued`, `simulated`, `failed`, or provider-reported `answered`).
- Call history filters, timestamps, outcome, priority and simulated/provider labels; CSV export contains demo metadata only.
- Helmet security headers, exact-origin CORS, signed server-side sessions, 50 KB request limit, input bounds, per-route rate limits, and a daily Gemini request cap.
- Twilio webhook routes use Twilio signature verification instead of the dashboard session. AI output or caller speech cannot itself trigger a call; escalation rules run on the server.

## Requirements

- Node.js 18 or newer
- npm
- Optional: Gemini API key for generated non-emergency replies
- Optional: eligible Twilio Voice account and public HTTPS webhook

## Run locally

Open two PowerShell terminals in `ai-student-counselor-agent`.

### 1. Start the server

```powershell
cd server
Copy-Item .env.example .env
# Change SESSION_SECRET to a unique local random value in server/.env.
npm install
npm run dev
```

The API health endpoint is `http://localhost:4000/api/health`. The backend loads `server/.env`; keep real credentials out of Git. If no Gemini key is present, the demo uses a scripted fallback. Live Twilio calls remain off unless `ENABLE_LIVE_CALLS=true` is set explicitly.

### 2. Start the client

```powershell
cd client
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. Vite proxies `/api` requests to the local Express server.

### 3. Verify tests and dependencies

From the project folder:

```powershell
npm test --prefix server
npm audit --prefix server
npm audit --prefix client
npm run build --prefix client
```

The Node test runner mocks Gemini, Twilio, speech synthesis, and microphone recognition. It never places a real call or opens a microphone.

## Manual microphone and speech checklist

Use current Chrome or Edge on an HTTPS origin (localhost is treated as a secure development context). Use only fictional speech.

1. Sign in with a fictional 10-digit phone number and the displayed demo OTP.
2. Open **Settings**, turn voice on, and choose English, Telugu, or Hindi.
3. Open **AI Call Agent**, start a simulated call, choose **Start microphone**, and grant permission only if you wish to test it.
4. Confirm the mic-active indicator is visible, speak a harmless fictional test sentence, then use **Stop microphone**.
5. Confirm the transcript/reply is visible as text captions; test **Play reply again** and the browser's failed-permission fallback.
6. Turn voice off and confirm speech is cancelled; check that keyboard focus and the Stop button remain usable.
7. End the simulated call. Do not enable or test real telephony for this checklist.

## Deploy to Render

The included `render.yaml` defines one free Render web service named `careconnect-ai-guardian`. It installs both packages, builds `client/dist`, starts Express, and checks `/api/health`.

### Push to a new GitHub repository

1. Create an **empty** GitHub repository (do not initialize it with a README or license).
2. In PowerShell, enter the repository at `ai-student-counselor-agent`, review the status, set the new remote, and push:

```powershell
cd ai-student-counselor-agent
git status --short
git remote set-url origin https://github.com/<YOUR-USERNAME>/<NEW-REPOSITORY>.git
git add .
git status --short
git commit -m "Secure CareConnect AI guardian demo"
git push -u origin main
```

Replace the two placeholders. Confirm `server/.env`, `node_modules/`, `.git/`, and `client/dist/` are not staged. If this checkout has no `origin`, use `git remote add origin <URL>` instead of `git remote set-url`.

### Create the Render service

1. Sign in at Render and choose **New → Blueprint**.
2. Connect the new GitHub repository and select the branch containing `render.yaml`.
3. Review the Blueprint, set `SESSION_SECRET` (and optionally `GEMINI_API_KEY`), and deploy **`careconnect-ai-guardian`**. `CLIENT_ORIGIN` can be set after Render assigns the service URL; the app uses Render's exact `RENDER_EXTERNAL_URL` in the meantime.
4. Wait for the deploy to become **Live**. Copy the exact HTTPS origin shown for the service, such as `https://careconnect-ai-guardian.onrender.com`, and add it as `CLIENT_ORIGIN` in the service's **Environment** tab. Save the change and wait for Render to redeploy.
5. Open `https://<your-service-name>.onrender.com/api/health`. A successful deployment returns JSON with `ok: true`. Only call this live after you have personally opened and verified that endpoint.

### Render environment variables

Add these in the service's **Environment** tab; secrets must not be added to Git:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | A unique, long random value (at least 32 random bytes); keep it private |
| `GEMINI_API_KEY` | Optional; leave unset/blank for scripted fallback |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `CLIENT_ORIGIN` | After the first deploy, set the exact assigned origin, e.g. `https://careconnect-ai-guardian.onrender.com` (no trailing slash) |
| `ENABLE_LIVE_CALLS` | `false` unless live calling has separately been approved and reviewed |

Render provides `RENDER_EXTERNAL_URL` for the deployed service; CORS accepts only the configured client origin and that exact Render origin. If the Render-assigned URL differs, update `CLIENT_ORIGIN` to the exact origin and redeploy.

**Only if Twilio confirms the account and use case are eligible**, configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `GUARDIAN_PHONE_NUMBER`, and `PUBLIC_BASE_URL` as server-only environment variables. `PUBLIC_BASE_URL` must be the public HTTPS Render origin. Then, and only after authorized consent and safety review, set `ENABLE_LIVE_CALLS=true`. Configure Twilio's incoming webhook to `https://<your-service-name>.onrender.com/api/telephony/incoming` using POST. Do not use real student data.

After deployment, verify `/api/health`, demo login, one normal fictional conversation, an emergency **simulation**, and the microphone/speech checklist above. Do not trigger a real outbound call as a deployment smoke test.

## Endpoints

- `GET /api/health` — public Render health/configuration status
- `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `GET /api/auth/session`, `POST /api/auth/logout` — demo login/session
- `GET /api/students/:id`, `GET /api/calls`, `POST /api/agent/respond` — signed-session routes
- `POST /api/emergency/call-counselor` — signed-session route; requires `confirm: "CALL GUARDIAN"`
- `POST /api/telephony/incoming`, `/api/telephony/voice-turn`, `/api/telephony/guardian-transfer-result`, `/api/telephony/guardian-voice`, `/api/telephony/status` — Twilio signature-validated webhook routes

## Optional Gemini setup

Set `GEMINI_API_KEY` and `GEMINI_MODEL` in `server/.env` locally or in Render's server environment. The server caps Gemini requests per minute and per UTC day; the default daily limit is 100. The model handles routine replies only. It cannot authorize calls or escalation.

## Optional Twilio setup

Do not enable this until account eligibility, consent, public HTTPS webhooks, and a qualified safety/privacy review are complete. Keep all Twilio credentials in server environment variables. Validate the webhook URL exactly against `PUBLIC_BASE_URL`. `ENABLE_LIVE_CALLS` defaults to off; the dashboard requires an explicit confirmation and the server applies a cooldown and three-call hourly ceiling. Browser microphone and dashboard simulation are not Twilio calls.

## Optional Vercel configuration

The existing root `vercel.json` was retained from the working checkout. It describes a separate Vercel client/API deployment. The deployment instructions and Blueprint in this README target Render, where both client and API are served by the single Express web service. Do not configure both deployments with the same live Twilio settings unless each webhook URL and security configuration has been reviewed independently.
