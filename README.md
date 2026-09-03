# Nihongo Quest 1.3

Vite + Supabase Japanese quiz website. Romaji-only learning content.

## What changed in 1.3
- Fixed the admin question-save workflow from 1.2.
- Fixed the mobile hamburger menu and added a working popup menu.
- Restored Admin access on mobile through the menu.
- Added favicon/site icons for browser tabs and bookmarks.
- The question save now writes both the new `options/correct_index` fields and the older compatibility fields.
- The app verifies that Supabase actually returned the saved question before showing success.
- Clearer question-save error messages.
- Added a small v1.3 label in the private admin area.

## Deploy
1. Upload the contents of this folder to the root of the GitHub repository.
2. Keep `package.json`, `index.html`, `src/`, `vercel.json`, `.env.example`, and `.gitignore` at repository root.
3. Vercel should build with `npm run build` and Framework Preset `Other`.
4. Keep the existing Vercel Production environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   Both should be type `Config`.

## Supabase
The current database should already have the `topics`, `questions`, and `admin_users` tables, the admin RLS policies, and your admin user. `SUPABASE-1.2-FIX.sql` is included only as a compatibility repair if question saving reports a database error.

## Routes
- `/` quiz library
- `/quiz/<slug>` direct topic quiz
- `/admin` private admin
