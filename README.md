# Nihongo Quest — Production 1.1

A quiz-only Japanese learning website built for Vercel + GitHub + Supabase.

## What is included

- 40 topic slots with direct links such as `/quiz/greetings` and `/quiz/self-introduction`
- Romaji-only learning content
- Student quiz flow with automatic marking and final percentage
- Private Supabase Auth admin login at `/admin`
- Admin CRUD for topics
- Admin CRUD for questions, four options, correct answer, ordering and visibility
- Supabase Row Level Security (RLS)
- Vercel SPA rewrites for direct quiz URLs
- Cherry-blossom / Japanese-inspired tech-company visual design
- No streaks, levels, progress dashboards, achievements or leaderboards

## The three-service architecture

GitHub = stores the website source code and version history.

Vercel = builds and hosts the website. It is connected to the GitHub repository, so pushes to the production branch can automatically deploy a new production version and other branches can create preview deployments.

Supabase = stores topics/questions and handles admin authentication. The website connects to Supabase from the browser using the publishable key. Database security is enforced with RLS.

## First-time setup

1. Create a new GitHub repository.
2. Upload every file in this project to that repository.
3. In Supabase, create a new project.
4. Open Supabase SQL Editor and run `supabase.sql`.
5. In Supabase Authentication -> Users, create your admin email/password account.
6. Copy that Auth user's UUID and run the final `insert into public.admin_users...` command shown at the bottom of `supabase.sql`.
7. In Vercel, import the GitHub repository.
8. Add these Vercel Environment Variables for Production (and Preview if desired):
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable/anon key
9. Deploy.

Do NOT put a Supabase service-role/secret key into the browser or GitHub. Only use the publishable/anon key in this frontend app. RLS is what protects the database.

## Updating the site later

The normal workflow is:

1. Make a change to the project files.
2. Commit the change to GitHub.
3. Push it to a feature branch.
4. Vercel creates a Preview deployment.
5. Check the preview.
6. Merge the branch into `main` (or whatever branch you choose as Production).
7. Vercel automatically deploys the new production version.

Your Supabase data is separate from the website code, so changing the site's design does not erase topics/questions. Database structure changes should be done with a new SQL migration rather than deleting the production database.

## Important content workflow

The 40 starter topics are placeholders until the final syllabus is provided. Rename them in the admin panel. When the syllabus is ready, the topic slugs can be kept stable so links in your Excel timetable do not have to change unnecessarily.

Each topic can eventually contain 10 questions. The admin panel lets you enter each question, four options and the correct option manually.


## Versioning

Website releases use decimal versions: 1.1, 1.2, 1.3 and so on. A major redesign starts a new major version such as 2.0. Quiz content stored in Supabase is independent from website code deployments.

## Vercel deployment note

The repository root must contain `index.html`, `package.json`, `vercel.json`, and the `src/` folder. Inside `src/`, `main.js` must exist exactly with that lowercase filename. Vercel should use Framework Preset `Other`; the build command comes from `npm run build`.
