<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ProgressController extends Controller
{
    // STUDENT: my progress across all unlocked lessons
    public function mine(Request $request)
    {
        return $this->studentProgress($request->user()->user_id);
    }

    // STUDENT: save progress on one lesson
    public function save(Request $request, int $lessonId)
    {
        $data = $request->validate(['completion_pct' => 'required|numeric|min:0|max:100']);
        $studentId = $request->user()->user_id;

        $lesson = Lesson::findOrFail($lessonId);
        abort_unless($lesson->is_unlocked, 403, 'This lesson is locked.');

        $existing = DB::table('student_lesson_progress')
            ->where('student_id', $studentId)
            ->where('lesson_id', $lessonId)
            ->value('completion_pct');

        $pct = max((float) $existing, (float) $data['completion_pct']);

        DB::table('student_lesson_progress')->updateOrInsert(
            ['student_id' => $studentId, 'lesson_id' => $lessonId],
            ['completion_pct' => $pct, 'last_played_at' => now()]
        );

        return response()->json([
            'lesson_id' => $lessonId,
            'completion_pct' => $pct,
            'completed' => $pct >= 100,
        ]);
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
            $allowed = DB::table('student_profile')
                    ->where('student_id', $studentId)
                    ->where('created_by_teacher_id', $user->user_id)->exists()
                || DB::table('section_student as ss')
                    ->join('section as s', 's.section_id', '=', 'ss.section_id')
                    ->where('ss.student_id', $studentId)
                    ->where('s.teacher_id', $user->user_id)->exists();

            abort_unless($allowed, 403, 'Forbidden.');
        }

        return $this->studentProgress($studentId);
    }

    // Every unlocked lesson, with the student's progress (0 if not started)
    private function studentProgress(int $studentId)
    {
        return DB::table('lesson as l')
            ->leftJoin('student_lesson_progress as p', function ($join) use ($studentId) {
                $join->on('p.lesson_id', '=', 'l.lesson_id')
                     ->where('p.student_id', '=', $studentId);
            })
            ->where('l.is_unlocked', true)
            ->orderBy('l.level_no')->orderBy('l.lesson_id')
            ->selectRaw('
                l.lesson_id, l.title, l.level_no,
                COALESCE(p.completion_pct, 0) as completion_pct,
                p.last_played_at
            ')
            ->get();
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
}