# AI Bot Tester — Dashboard

A web app for testing client AI bots (GoHighLevel SMS and website chat, and Retell voice agents).
An **AI customer** talks to the bot. When the conversation ends, an **AI judge** grades it.

With this app you can:

- start a test,
- watch it live,
- read the judge's report,
- keep a library of reusable test scenarios.

The testing engine runs in **n8n** and stores its data in Supabase. This app is only the front end.
It talks to one n8n webhook, the **Dashboard API**. People sign in with **Supabase Auth**
(email + password).

## What you need

- Node.js 20 or newer
- The URL of the n8n Dashboard API webhook
- The Supabase project URL and its **anon / publishable** key
  (Supabase → Project Settings → API)
- A user account created in Supabase (see below)

## Environment variables

| Variable                 | What it is                                                     |
| ------------------------ | -------------------------------------------------------------- |
| `VITE_API_URL`           | The n8n Dashboard API webhook URL                              |
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
VITE_API_URL=https://n8n.srv1300653.hstgr.cloud/webhook/ai-tester/api
VITE_SUPABASE_URL=https://tmwdkbggletblpjzmhqz.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

Then start the dev server:

```bash
npm run dev
```

Open the link it prints (usually http://localhost:5173) and sign in with your email and password.

## Supabase setup

### 1. Turn off public sign-ups (important)

This app has no sign-up page, but Supabase will still accept sign-ups through its API unless you
turn them off. Anyone with the anon key could create an account and use the dashboard.

Supabase → **Authentication → Sign In / Providers** (called "Providers → Email" in older
dashboards) → turn **off** "Allow new users to sign up". Keep the **Email** provider turned on.

### 2. Add a user

1. Supabase → **Authentication → Users → Add user**.
2. Choose **Create new user**, type their email and a temporary password, and tick
   **Auto Confirm User**.
3. Send them the password. They can change it in the app under **Settings → Change password**.

Or choose **Send invitation**. They get an email, set their own password on the reset page, and are
then signed in.

To remove access, delete the user (or ban them) in the same list.

### 3. Allow the password-reset link

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
4. Go to **Site configuration → Environment variables** and add `VITE_API_URL`,
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. `netlify.toml` already has the SPA redirect (`/* → /index.html 200`), so links like
   `/tests/42` and `/reset-password` keep working when you refresh the page.
6. Add the Netlify address to the Supabase URL Configuration (see above).

> The `VITE_…` values are added to the app when it is built. If you change one, deploy again.

## Important: allow CORS in n8n

The browser calls n8n from another domain, so n8n must allow it:

1. Open the **Dashboard API** workflow in n8n.
2. Click the **Webhook** node → **Options** → **Allowed Origins (CORS)**.
3. Add your app's address, for example `https://your-site.netlify.app`. For local development,
   also add `http://localhost:5173`. Separate them with commas.
4. Save the workflow and make sure it is **active**.

Every call sends an `Authorization: Bearer <token>` header, so the browser first sends a
"preflight" `OPTIONS` request. n8n must allow the `Authorization` header in that preflight. If you
see "Network error — could not reach the API", check CORS first.

## How sign-in works

- The app signs in with Supabase and keeps the session in this browser. Supabase refreshes the
  token automatically.
- Every API call sends the current access token as `Authorization: Bearer …`. n8n checks it with
  Supabase.
- If n8n answers `unauthorized`, the app refreshes the session once and tries again. If it fails
  again, the user is signed out and sent to the sign-in page.
- "Sign out" (in the user menu) signs out this browser only and clears the cached data.

## What is kept in the browser

- **In n8n / Supabase:** users, tests, messages, judge results and scenarios.
- **In this browser (localStorage):** the Supabase session, the Settings defaults, the last
  channel and targets you used, and the theme.

## Project layout

```
src/
  api/         client.ts (typed API call + types), hooks.ts (TanStack Query hooks)
  components/  layout, user menu, auth card, password form, badges, scenario fields,
               trend chart, scenario modal
  components/ui/  small building blocks: Button, Field/Input/Select/Textarea, Card, Badge,
               Modal, Toast, EmptyState, Skeleton
  lib/         supabase client, auth provider, storage, theme, validation (zod), formatting
  pages/       Login, Reset password, Run, Results, Test detail, Scenarios, Settings
```
