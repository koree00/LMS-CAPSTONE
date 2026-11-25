# SNED Web (EduQuest AI frontend)

React + Vite + Tailwind. Talks to the Laravel API in `../sned-api`.

## Run

1. `npm install`
2. Check `.env`: `VITE_API_URL=http://127.0.0.1:8000/api`
3. Apply `BACKEND_PATCH.md` to `sned-api` (needed for the new screens)
4. Start the API (`php artisan serve` in `sned-api`) and the rule engine, then `npm run dev`
5. Open http://localhost:5173

Or run everything at once from this folder:

    powershell -ExecutionPolicy Bypass -File .\run-all.ps1

## Interfaces

- Master Teacher (`/app`): Overview, User Management, Sections, Student Records,
  Learning Content, Audit Log & Reports, Settings.
- Teacher (`/app`): Overview, Section & Learners, Gamified Lessons, Student
  Records, Reports & Analytics, Settings.
- Student (`/student`): home, lessons, weekly game, reward shop, pet, settings.
