# Backend changes for the new UI

The updated screens need five small backend changes. Do them in order, then run
`php artisan migrate` and restart `php artisan serve`.

## 1. Exceptionality column

    php artisan make:migration add_exceptionality_to_student_profile

In the new migration:

```php
public function up(): void
{
    Schema::table('student_profile', function (Blueprint $t) {
        $t->string('exceptionality', 120)->nullable();
    });
}

public function down(): void
{
    Schema::table('student_profile', function (Blueprint $t) {
        $t->dropColumn('exceptionality');
    });
}
```

## 2. AccountController: replace `createStudent()` and `index()`

In `app/Http/Controllers/Api/AccountController.php`.

```php
    // Master Teacher or Teacher: create a student
    public function createStudent(Request $request)
    {
        $actor = $request->user();
        $isMaster = $actor->role->name === 'master_teacher';

        if ($isMaster && ! DB::table('master_teacher')->where('master_teacher_id', $actor->user_id)
                ->value('can_manage_student_accounts')) {
            return response()->json(['message' => 'Not allowed to manage student accounts.'], 403);
        }

        $data = $request->validate([
            'nickname' => 'required|string|max:60',
            'guardian_email' => 'required|email|unique:user_account,email',
            'exceptionality' => 'nullable|string|max:120',
        ]);

        // The learner signs in with the email provided
        $loginEmail = Str::lower($data['guardian_email']);
        $tempPassword = Str::password(10, symbols: false);

        $user = DB::transaction(function () use ($data, $loginEmail, $tempPassword, $actor, $isMaster) {
            $user = UserAccount::create([
                'role_id' => Role::where('name', 'student')->value('role_id'),
                'email' => $loginEmail,
                'password_hash' => $tempPassword,
            ]);
            DB::table('student_profile')->insert([
                'student_id' => $user->user_id,
                'nickname' => $data['nickname'],
                'guardian_email' => $data['guardian_email'],
                'exceptionality' => $data['exceptionality'] ?? null,
                'created_by_teacher_id' => $isMaster ? null : $actor->user_id,
            ]);
            return $user;
        });

        AuditLog::record($actor->user_id, 'create_student', ['user_id' => $user->user_id]);

        return response()->json([
            'user_id' => $user->user_id,
            'login_email' => $loginEmail,
            'temporary_password' => $tempPassword, // shown once
        ], 201);
    }

    // List accounts. Master Teacher: "all", "teacher" or "student". Teacher: "student" only.
    public function index(Request $request, string $role)
    {
        abort_unless(in_array($role, ['all', 'teacher', 'student'], true), 404);
        $actor = $request->user();

        if ($actor->role->name === 'teacher' && $role !== 'student') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = DB::table('user_account as u')
            ->join('role as r', 'r.role_id', '=', 'u.role_id')
            ->leftJoin('teacher_profile as tp', 'tp.teacher_id', '=', 'u.user_id')
            ->leftJoin('student_profile as sp', 'sp.student_id', '=', 'u.user_id')
            ->whereIn('r.name', $role === 'all' ? ['teacher', 'student'] : [$role])
            ->selectRaw("
                u.user_id, u.email, u.status, u.created_at,
                r.name AS role,
                COALESCE(tp.display_name, sp.nickname) AS name,
                sp.guardian_email,
                sp.exceptionality,
                COALESCE(
                    (SELECT string_agg(s.section_name, ', ' ORDER BY s.section_name)
                       FROM section_student ss
                       JOIN section s ON s.section_id = ss.section_id
                      WHERE ss.student_id = u.user_id),
                    (SELECT string_agg(s.section_name, ', ' ORDER BY s.section_name)
                       FROM section s
                      WHERE s.teacher_id = u.user_id)
                ) AS sections
            ")
            ->orderBy('u.user_id');

        if ($actor->role->name === 'teacher') {
            $ids = DB::table('student_profile')
                ->where('created_by_teacher_id', $actor->user_id)
                ->pluck('student_id')
                ->merge(
                    DB::table('section_student as ss')
                        ->join('section as s', 's.section_id', '=', 'ss.section_id')
                        ->where('s.teacher_id', $actor->user_id)
                        ->pluck('ss.student_id')
                )
                ->unique()
                ->values();

            $query->whereIn('u.user_id', $ids);
        }

        return $query->paginate(25);
    }
```

## 3. ProgressController: add three methods

Paste these inside the class in `app/Http/Controllers/Api/ProgressController.php`.

```php
    // MASTER / TEACHER: completion by level, for the overview chart
    public function completion(Request $request)
    {
        $user = $request->user();

        $query = DB::table('lesson as l')
            ->leftJoin('student_lesson_progress as p', 'p.lesson_id', '=', 'l.lesson_id')
            ->where('l.is_unlocked', true);

        if ($user->role->name === 'teacher') {
            $ids = $this->teacherStudentIds($user->user_id);
            $query->where(function ($w) use ($ids) {
                $w->whereNull('p.student_id')->orWhereIn('p.student_id', $ids);
            });
        }

        $levels = (clone $query)
            ->groupBy('l.level_no')
            ->orderBy('l.level_no')
            ->selectRaw("
                l.level_no,
                COUNT(DISTINCT l.lesson_id) AS lessons,
                COALESCE(SUM(CASE WHEN p.completion_pct >= 100 THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN p.completion_pct > 0 AND p.completion_pct < 100 THEN 1 ELSE 0 END), 0) AS in_progress
            ")
            ->get();

        $avg = (clone $query)->whereNotNull('p.student_id')->avg('p.completion_pct');

        return response()->json([
            'levels' => $levels,
            'avg_completion' => round((float) $avg, 1),
        ]);
    }

    // MASTER / TEACHER: header numbers for one student's record
    public function summary(Request $request, int $studentId)
    {
        $profile = DB::table('student_profile as sp')
            ->join('user_account as u', 'u.user_id', '=', 'sp.student_id')
            ->where('sp.student_id', $studentId)
            ->select('sp.student_id', 'sp.nickname', 'sp.guardian_email', 'sp.exceptionality',
                     'sp.sensory_preferences', 'u.email', 'u.status')
            ->first();
        abort_unless($profile, 404);

        $user = $request->user();
        if ($user->role->name === 'teacher') {
            abort_unless($this->teacherStudentIds($user->user_id)->contains($studentId), 403, 'Forbidden.');
        }

        if (is_string($profile->sensory_preferences)) {
            $profile->sensory_preferences = json_decode($profile->sensory_preferences, true);
        }

        $attempts = DB::table('game_attempt')->where('student_id', $studentId);
        $coins = DB::table('coin_transaction')->where('student_id', $studentId);

        return response()->json([
            'profile' => $profile,
            'sections' => DB::table('section_student as ss')
                ->join('section as s', 's.section_id', '=', 'ss.section_id')
                ->where('ss.student_id', $studentId)
                ->pluck('s.section_name'),
            'games_played' => (clone $attempts)->count(),
            'weeks_played' => (clone $attempts)->distinct()->count('game_id'),
            'best_score' => (int) (clone $attempts)->max('score'),
            'coins_earned' => (int) (clone $coins)->where('amount', '>', 0)->sum('amount'),
            'coin_balance' => (int) (clone $coins)->sum('amount'),
        ]);
    }

    private function teacherStudentIds(int $teacherId)
    {
        return DB::table('student_profile')
            ->where('created_by_teacher_id', $teacherId)
            ->pluck('student_id')
            ->merge(
                DB::table('section_student as ss')
                    ->join('section as s', 's.section_id', '=', 'ss.section_id')
                    ->where('s.teacher_id', $teacherId)
                    ->pluck('ss.student_id')
            )
            ->unique()
            ->values();
    }
```

## 4. Routes

In `routes/api.php`, inside the "Full tokens only" group (the `ProgressController`
import is already there):

```php
Route::middleware('role:master_teacher,teacher')->group(function () {
    Route::get('/analytics/completion', [ProgressController::class, 'completion']);
    Route::get('/students/{studentId}/summary', [ProgressController::class, 'summary']);
});
```

## 5. Run it

    php artisan migrate
    php artisan route:list --path=analytics

Restart `php artisan serve`.
