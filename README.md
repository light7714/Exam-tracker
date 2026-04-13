# Exam Tracker

A private NEET prep tracker built with Next.js for:

- monthly mock-test logging
- daily notes
- revision tracking by subject, chapter, and optional unit
- chapter and unit note pages with checklist support

## Tech stack

- Next.js
- React
- Supabase for cloud sync across devices
- Local JSON fallback for development only when Supabase is not configured

## Environment variables

Create an `.env.local` file from `.env.example`.

Required values:

```env
SITE_ENTRY_NAME=Full Name Here
ACCESS_COOKIE_SECRET=replace-with-a-random-secret
NEXT_PUBLIC_EXAM_DATE=2026-05-03
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Notes:

- `SITE_ENTRY_NAME` is the soft-gate full name.
- `ACCESS_COOKIE_SECRET` should be a random long secret.
- `NEXT_PUBLIC_EXAM_DATE` is the exam date shown in the UI.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are needed for real cloud sync.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`.

3. For local testing only, you can run without Supabase by setting just:

```env
SITE_ENTRY_NAME=Full Name Here
ACCESS_COOKIE_SECRET=replace-with-a-random-secret
NEXT_PUBLIC_EXAM_DATE=2026-05-03
```

4. Start the dev server:

```bash
npm run dev
```

5. Open:

```text
http://127.0.0.1:3000
```

## Important note about local mode

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are missing, the app uses a local JSON store only for development.

That means:

- data is not shared across devices
- data is not suitable for production use
- iPad and phone sync will not work

For the real deployed version, use Supabase.

## Set up Supabase

1. Create a new project in Supabase.

2. Open the SQL Editor in Supabase.

3. Copy and run the SQL from:

- [supabase/schema.sql](/Users/shubham/Desktop/untitled%20folder/new%20life%20shaal/websites/Exam%20Tracker/supabase/schema.sql)

4. In Supabase project settings, copy:

- Project URL
- service role key

5. Put them into `.env.local` and later also into Vercel environment variables.

Important:

- do not expose the service role key in frontend code
- do not put the service role key in `NEXT_PUBLIC_...`

## First deployment to Vercel

Recommended setup:

- code hosted on GitHub
- project deployed on Vercel
- database hosted on Supabase

### Step 1: Push the project to GitHub

1. Create a new GitHub repository.
2. Push this project to that repository.

### Step 2: Import the project into Vercel

1. Log in to Vercel.
2. Click `Add New...`
3. Choose `Project`
4. Import the GitHub repository
5. Keep the framework as `Next.js`

### Step 3: Add environment variables in Vercel

Add these variables in the Vercel project settings:

- `SITE_ENTRY_NAME`
- `ACCESS_COOKIE_SECRET`
- `NEXT_PUBLIC_EXAM_DATE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Suggested values:

- `SITE_ENTRY_NAME`: the exact full name you want for the soft gate
- `ACCESS_COOKIE_SECRET`: any strong random string
- `NEXT_PUBLIC_EXAM_DATE`: `2026-05-03`
- `SUPABASE_URL`: your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: your Supabase service role key

### Step 4: Deploy

1. Click `Deploy`
2. Wait for the first production deployment to finish
3. Open the Vercel URL and test:

- login page
- calendar page
- notes page
- revision page
- score save/edit/delete

### Step 5: Optional custom domain

If you want a custom domain:

1. Open the Vercel project
2. Go to `Settings`
3. Go to `Domains`
4. Add your domain and follow the DNS instructions

## How to deploy future changes

If you make future code changes, use this flow:

1. Make the code changes locally
2. Test locally:

```bash
npm run typecheck
npm run build
```

3. Commit the changes
4. Push to the connected GitHub branch

If Vercel is connected to GitHub:

- Vercel will automatically create a new deployment on push

If you need to redeploy manually:

1. Open the Vercel project dashboard
2. Open the latest deployment or commit
3. Click `Redeploy`

## If future changes include database changes

If you add new tables, columns, or constraints later:

1. Update `supabase/schema.sql`
2. Run the new SQL in the Supabase SQL Editor
3. Update the app code
4. Test locally
5. Deploy to Vercel

Try to keep a record of every SQL change so production and local setup stay in sync.

Current reminder:

- the chapter/unit notes feature requires the latest `supabase/schema.sql`, which adds `revision_chapter_notes` and `revision_unit_notes`

## Useful commands

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Type check:

```bash
npm run typecheck
```

Production build test:

```bash
npm run build
```

Run production server locally after build:

```bash
npm run start
```

## Soft gate note

The full-name screen is only a soft privacy gate, not real authentication.

It is fine for a personal private-feeling site, but it is not secure like proper login/auth.

## Official references

- [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)
- [Vercel Git-based deployments](https://vercel.com/docs/deployments/git/vercel-for-github)
- [Vercel environment variables docs](https://vercel.com/docs/environment-variables)
- [Supabase project setup docs](https://supabase.com/docs/guides/getting-started)
- [Supabase SQL Editor docs](https://supabase.com/docs/guides/database/overview)
