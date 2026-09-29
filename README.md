# AI Bot Tester — Dashboard

A web app for testing client AI bots (GoHighLevel SMS and website chat, and Retell voice agents).
An **AI customer** talks to the bot. When the conversation ends, an **AI judge** grades it.

With this app you can:

- start a test,
- watch it live,
- read the judge's report,
- keep a library of reusable test scenarios.

The testing engine runs in **n8n** and stores its data in **Supabase**. This app is only the front
end:

- It **reads** tests and messages, **stops** tests and **manages scenarios** directly in Supabase.
  Row-level security only lets signed-in users do this.
- It **starts** a test by calling the channel's n8n webhook:
  `/webhook/ai-tester/{sms|voice|chat}/start`.
- People sign in with **Supabase Auth** (email + password).

## What you need

- Node.js 20 or newer
- Your n8n webhook base URL, with the SMS workflow active (voice and chat workflows are optional)
- The Supabase project URL and its **anon / publishable** key
  (Supabase → Project Settings → API)
- A user account created in Supabase (see below)

## Environment variables

| Variable                 | What it is                                                     |
| ------------------------ | -------------------------------------------------------------- |
| `VITE_N8N_WEBHOOK_URL`   | n8n webhook base URL, e.g. `https://n8n.example.com/webhook`   |
| `VITE_SUPABASE_URL`      | Your Supabase project URL, e.g. `https://xxxx.supabase.co`     |
| `VITE_SUPABASE_ANON_KEY` | The Supabase **anon / publishable** key (never the secret key) |

The anon key is safe to put in the browser. **Never** use the `service_role` / secret key here.

## Run it on your computer

```bash
npm i
cp .env.example .env      # on Windows: copy .env.example .env
```

Open `.env` and fill in the three values:

```
VITE_N8N_WEBHOOK_URL=https://n8n.srv1300653.hstgr.cloud/webhook
VITE_SUPABASE_URL=https://tmwdkbggletblpjzmhqz.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

Then start the dev server:

```bash
npm run dev
```

Open the link it prints (usually http://localhost:5173) and sign in with your email and password.

## Supabase setup

### 1. Create the dashboard tables and access rules (once)

Supabase → **SQL Editor** → paste all of [`supabase/dashboard.sql`](supabase/dashboard.sql) → **Run**.
You can safely run it again. It:

- creates the `ai_test_scenarios` table for saved scenarios,
- turns on row-level security, so only **signed-in** users can read tests and messages and manage
  scenarios. Signed-out visitors with the anon key get nothing,
- adds the `ai_test_session_list` view the Results page reads,
- adds the `abort_test_session` function the **Stop test** button calls. Users can't edit test
  results directly.

n8n connects with its Postgres credential, which bypasses row-level security, so the workflows keep
working unchanged.

If you see "The database is missing dashboard tables" or "Permission denied" in the app, this step
hasn't been run.

### 2. Turn off public sign-ups (important)

This app has no sign-up page, but Supabase will still accept sign-ups through its API unless you
turn them off. Anyone with the anon key could create an account and use the dashboard.

Supabase → **Authentication → Sign In / Providers** (called "Providers → Email" in older
dashboards) → turn **off** "Allow new users to sign up". Keep the **Email** provider turned on.

### 3. Add a user

1. Supabase → **Authentication → Users → Add user**.
2. Choose **Create new user**, type their email and a temporary password, and tick
   **Auto Confirm User**.
3. Send them the password. They can change it in the app under **Settings → Change password**.

Or choose **Send invitation**. They get an email, set their own password on the reset page, and are
then signed in.

To remove access, delete the user (or ban them) in the same list.

### 4. Allow the password-reset link

"Forgot password?" sends an email whose link opens `<your app>/reset-password`. Supabase only
redirects to addresses you allow:

Supabase → **Authentication → URL Configuration**

- **Site URL:** your live app, e.g. `https://your-site.netlify.app`
- **Redirect URLs:** add `https://your-site.netlify.app/reset-password` and, for local
  development, `http://localhost:5173/reset-password`

## Other commands

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run build`     | Type-checks and builds the app into `dist/`      |
| `npm run preview`   | Serves the built app locally so you can check it |
| `npm run lint`      | Runs ESLint                                      |
| `npm run format`    | Formats all files with Prettier                  |
| `npm run typecheck` | Runs the TypeScript check only                   |

## Deploy to Netlify

1. Push this folder to a Git repo (GitHub, GitLab, …).
2. In Netlify, choose **Add new site → Import an existing project** and pick the repo.
3. Netlify reads the build settings from `netlify.toml`:
   - build command: `npm run build`
   - publish directory: `dist`
4. Go to **Site configuration → Environment variables** and add `VITE_N8N_WEBHOOK_URL`,
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. `netlify.toml` already has the SPA redirect (`/* → /index.html 200`), so links like
   `/tests/42` and `/reset-password` keep working when you refresh the page.
6. Add the Netlify address to the Supabase URL Configuration (see above).

> The `VITE_…` values are added to the app when it is built. If you change one, deploy again.

## n8n: start webhooks and CORS

The app starts a test with `POST {VITE_N8N_WEBHOOK_URL}/ai-tester/{channel}/start`. The body holds
the channel's target fields plus the scenario:

| Channel | Webhook path             | Body                                                                |
| ------- | ------------------------ | ------------------------------------------------------------------- |
| SMS     | `/ai-tester/sms/start`   | `{ tester_number, bot_number, scenario }`                           |
| Voice   | `/ai-tester/voice/start` | `{ from_number, to_number, tester_agent_id?, scenario }`            |
| Chat    | `/ai-tester/chat/start`  | `{ location_id, message_type, conversation_provider_id, scenario }` |

`scenario` is `{ name, persona, goal, checks, max_turns, bot_starts? }`. `bot_starts: true` is sent
for SMS only, when "Bot sends the first message" is ticked. Each workflow must reply
`{ "session_id": <id> }`.

The browser calls n8n from another domain, so **each start webhook** must allow it:

1. Open the channel workflow in n8n and click its **Start** Webhook node.
2. **Options → Allowed Origins (CORS)**: add your app's address, for example
   `https://your-site.netlify.app`, and `http://localhost:5173` for local development. Separate
   them with commas.
3. Save and make sure the workflow is **active**.

If the app says "Could not reach the … test workflow", the webhook is missing, inactive, or blocked
by CORS. Note that n8n answers a browser with a CORS error (not a 404) when the workflow isn't
active.

> **Security note:** the start webhooks don't check who is calling. Anyone who knows the URL can
> start a test, but they can't read any results. To lock them down, add a step at the start of each
> workflow that checks the `Authorization` header against Supabase. The app can send it on request.

## How sign-in works

- The app signs in with Supabase and keeps the session in this browser. Supabase refreshes the
  token automatically.
- Database reads and writes use that session, and row-level security only allows signed-in users.
- If Supabase rejects the token, the app refreshes the session once and tries again. If it fails
  again, the user is signed out and sent to the sign-in page.
- "Sign out" (in the user menu) signs out this browser only and clears the cached data.

## What is kept in the browser

- **In n8n / Supabase:** users, tests, messages, judge results and scenarios.
- **In this browser (localStorage):** the Supabase session, the Settings defaults, the last
  channel and targets you used, and the theme.

## Project layout

```
src/
  api/         client.ts (Supabase queries + n8n start webhooks), types.ts, hooks.ts (TanStack Query)
  components/  layout, user menu, auth card, password form, badges, scenario fields,
               trend chart, scenario modal
  components/ui/  small building blocks: Button, Field/Input/Select/Textarea, Card, Badge,
               Modal, Toast, EmptyState, Skeleton
  lib/         supabase client, auth provider, storage, theme, validation (zod), formatting
  pages/       Login, Reset password, Run, Results, Test detail, Scenarios, Settings
supabase/
  dashboard.sql  one-time setup: scenarios table, row-level security, list view, stop function
```
