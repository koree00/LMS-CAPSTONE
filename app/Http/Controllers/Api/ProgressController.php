<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class ProgressController extends Controller
{
    // Stars a student wins the first time they finish a lesson
    private const STARS_PER_LESSON = 5;

    // STUDENT: my progress across all unlocked lessons
    public function mine(Request $request)
    {
        return $this->studentProgress($request->user()->user_id);
    }

    // STUDENT: save progress on one lesson. Finishing it for the first time pays 5 stars.
    public function save(Request $request, int $lessonId)
    {
        $data = $request->validate(['completion_pct' => 'required|numeric|min:0|max:100']);
        $studentId = $request->user()->user_id;

        $lesson = Lesson::findOrFail($lessonId);
        abort_unless($lesson->is_unlocked, 403, 'This lesson is locked.');

        return DB::transaction(function () use ($studentId, $lessonId, $data) {
            // Lock this student's row so two quick taps cannot pay the stars twice
            DB::table('student_profile')->where('student_id', $studentId)->lockForUpdate()->first();

            $existing = (float) DB::table('student_lesson_progress')
                ->where('student_id', $studentId)
                ->where('lesson_id', $lessonId)
                ->value('completion_pct');

            $pct = max($existing, (float) $data['completion_pct']);

            DB::table('student_lesson_progress')->updateOrInsert(
                ['student_id' => $studentId, 'lesson_id' => $lessonId],
                ['completion_pct' => $pct, 'last_played_at' => now()]
            );

            $stars = 0;
            if ($pct >= 100) {
                $alreadyPaid = DB::table('coin_transaction')
                    ->where('student_id', $studentId)
                    ->where('reason', 'lesson_complete')
                    ->where('ref_id', $lessonId)
                    ->exists();

                if (! $alreadyPaid) {
                    DB::table('coin_transaction')->insert([
                        'student_id' => $studentId,
                        'amount' => self::STARS_PER_LESSON,
                        'reason' => 'lesson_complete',
                        'ref_id' => $lessonId,
                    ]);
                    $stars = self::STARS_PER_LESSON;
                }
            }

            return response()->json([
                'lesson_id' => $lessonId,
                'completion_pct' => $pct,
                'completed' => $pct >= 100,
                'stars_earned' => $stars,
            ]);
        });
    }

    // TEACHER / MASTER: summary for every student in a section
    public function section(Request $request, int $id)
    {
        $section = Section::findOrFail($id);
        $user = $request->user();

        if ($user->role->name === 'teacher') {
            abort_unless($section->teacher_id === $user->user_id, 403, 'Forbidden.');
        }

        $students = DB::table('section_student as ss')
            ->join('student_profile as sp', 'sp.student_id', '=', 'ss.student_id')
            ->leftJoin('student_lesson_progress as p', 'p.student_id', '=', 'ss.student_id')
            ->where('ss.section_id', $section->section_id)
            ->groupBy('sp.student_id', 'sp.nickname')
            ->selectRaw("
                sp.student_id,
                sp.nickname,
                COUNT(p.progress_id) as lessons_started,
                COALESCE(SUM(CASE WHEN p.completion_pct >= 100 THEN 1 ELSE 0 END), 0) as lessons_completed,
                COALESCE(ROUND(AVG(p.completion_pct), 2), 0) as avg_completion,
                MAX(p.last_played_at) as last_played_at
            ")
            ->orderBy('sp.nickname')
            ->get();

        return response()->json(['section' => $section, 'students' => $students]);
    }

    // TEACHER / MASTER: one student's per-lesson progress
    public function student(Request $request, int $studentId)
    {
        abort_unless(DB::table('student_profile')->where('student_id', $studentId)->exists(), 404);
        $user = $request->user();

        if ($user->role->name === 'teacher') {
            abort_unless($this->teacherStudentIds($user->user_id)->contains($studentId), 403, 'Forbidden.');
        }

        return $this->studentProgress($studentId);
    }

    // STUDENT: which levels I've mastered, from the Python engine
    public function levels(Request $request)
    {
        $lessons = $this->studentProgress($request->user()->user_id)
            ->map(fn ($l) => [
                'lesson_id' => $l->lesson_id,
                'level_no' => $l->level_no,
                'completion_pct' => (float) $l->completion_pct,
            ])->values()->all();

        try {
            $res = Http::withHeaders(['X-Engine-Key' => config('services.engine.key')])
                ->timeout(3)
                ->post(config('services.engine.url') . '/levels', ['lessons' => $lessons]);

            if ($res->successful()) {
                return response()->json($res->json());
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['message' => 'Rule engine unavailable.'], 503);
    }

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
<<<<<<< HEAD
        $columns = ['sp.student_id', 'sp.nickname', 'sp.guardian_email',
                    'sp.sensory_preferences', 'u.email', 'u.status'];
        // Works before and after the exceptionality migration has run
        if (Schema::hasColumn('student_profile', 'exceptionality')) {
            $columns[] = 'sp.exceptionality';
        }

        $profile = DB::table('student_profile as sp')
            ->join('user_account as u', 'u.user_id', '=', 'sp.student_id')
            ->where('sp.student_id', $studentId)
            ->select($columns)
=======
        $profile = DB::table('student_profile as sp')
            ->join('user_account as u', 'u.user_id', '=', 'sp.student_id')
            ->where('sp.student_id', $studentId)
            ->select('sp.student_id', 'sp.nickname', 'sp.guardian_email', 'sp.exceptionality',
                     'sp.sensory_preferences', 'u.email', 'u.status')
>>>>>>> d75761003c1da4f52a57f3ae3c4470147bd97c78
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
        $stars = DB::table('coin_transaction')->where('student_id', $studentId);

        return response()->json([
            'profile' => $profile,
            'sections' => DB::table('section_student as ss')
                ->join('section as s', 's.section_id', '=', 'ss.section_id')
                ->where('ss.student_id', $studentId)
                ->pluck('s.section_name'),
            'games_played' => (clone $attempts)->count(),
            'weeks_played' => (clone $attempts)->distinct()->count('game_id'),
            'best_score' => (int) (clone $attempts)->max('score'),
            // Stars are stored in coin_transaction; the API keeps the old field names
            'coins_earned' => (int) (clone $stars)->where('amount', '>', 0)->sum('amount'),
            'coin_balance' => (int) (clone $stars)->sum('amount'),
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

    // Every unlocked lesson, with the student's progress (0 if not started)
    private function studentProgress(int $studentId)
    {
        // day_no exists once the latest migration has run
        $day = Schema::hasColumn('lesson', 'day_no') ? 'l.day_no,' : '';

        return DB::table('lesson as l')
            ->leftJoin('student_lesson_progress as p', function ($join) use ($studentId) {
                $join->on('p.lesson_id', '=', 'l.lesson_id')
                     ->where('p.student_id', '=', $studentId);
            })
            ->where('l.is_unlocked', true)
            ->orderBy('l.level_no')->orderBy('l.lesson_id')
            ->selectRaw("
                l.lesson_id, l.title, l.subject, {$day} l.level_no,
                COALESCE(p.completion_pct, 0) as completion_pct,
                p.last_played_at
            ")
            ->get();
    }
}
