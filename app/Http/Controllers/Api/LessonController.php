<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Lesson;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LessonController extends Controller
{
    // Students see only unlocked lessons; staff see everything
    public function index(Request $request)
    {
        $query = Lesson::orderBy('level_no')->orderBy('lesson_id');

        if ($request->user()->role->name === 'student') {
            $query->where('is_unlocked', true);
        }

        if ($request->filled('level_no')) {
            $query->where('level_no', $request->integer('level_no'));
        }

        if ($request->filled('subject')) {
            $query->where('subject', $request->input('subject'));
        }

        return $query->get();
    }

    public function days(Request $request)
    {
        $query = Lesson::orderBy('level_no')->orderBy('day_no')->orderBy('lesson_id');

        if ($request->user()->role->name === 'student') {
            $query->where('is_unlocked', true);
        }

        if ($request->filled('level_no')) {
            $query->where('level_no', $request->integer('level_no'));
        }

        $lessons = $query->get();

        $days = $lessons
            ->groupBy(fn ($lesson) => ($lesson->level_no ?? 1) . '-' . ($lesson->day_no ?? 1))
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'level_no' => (int) ($first->level_no ?? 1),
                    'day_no' => (int) ($first->day_no ?? 1),
                    'is_unlocked' => (bool) $group->every('is_unlocked'),
                    'lessons' => $group->values(),
                ];
            })
            ->values();

        return response()->json($days);
    }

    public function show(Request $request, int $id)
    {
        $lesson = Lesson::findOrFail($id);

        if ($request->user()->role->name === 'student' && ! $lesson->is_unlocked) {
            return response()->json(['message' => 'This lesson is locked.'], 403);
        }

        return $lesson;
    }

    // Master Teacher only (route middleware)
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:160',
            'description' => 'nullable|string',
            'subject' => ['required', Rule::in(Lesson::SUBJECTS)],
            'level_no' => 'required|integer|min:1',
            'day_no' => 'nullable|integer|min:1|max:5',
            'is_unlocked' => 'boolean',
        ]);

        $lesson = Lesson::create($data);

        AuditLog::record($request->user()->user_id, 'create_lesson', ['lesson_id' => $lesson->lesson_id]);

        return response()->json($lesson, 201);
    }

    public function update(Request $request, int $id)
    {
        $lesson = Lesson::findOrFail($id);

        $data = $request->validate([
            'title' => 'sometimes|string|max:160',
            'description' => 'nullable|string',
            'subject' => ['sometimes', Rule::in(Lesson::SUBJECTS)],
            'level_no' => 'sometimes|integer|min:1',
            'day_no' => 'sometimes|nullable|integer|min:1|max:5',
            'is_unlocked' => 'sometimes|boolean',
        ]);

        $lesson->update($data);

        AuditLog::record($request->user()->user_id, 'update_lesson', [
            'lesson_id' => $lesson->lesson_id,
            'changes' => array_keys($data),
        ]);

        return $lesson;
    }

    // MASTER / TEACHER: open or lock one whole day of a level (all its lessons at once)
    public function setDay(Request $request)
    {
        $data = $request->validate([
            'level_no' => 'required|integer|min:1',
            'day_no' => 'required|integer|min:1|max:5',
            'is_unlocked' => 'required|boolean',
        ]);

        $updated = DB::table('lesson')
            ->where('level_no', $data['level_no'])
            ->where('day_no', $data['day_no'])
            ->update(['is_unlocked' => $data['is_unlocked'], 'updated_at' => now()]);

        AuditLog::record(
            $request->user()->user_id,
            $data['is_unlocked'] ? 'open_day' : 'lock_day',
            ['level_no' => $data['level_no'], 'day_no' => $data['day_no'], 'lessons' => $updated]
        );

        return response()->json(['updated' => $updated]);
    }

    public function destroy(Request $request, int $id)
    {
        $lesson = Lesson::findOrFail($id);
        $lesson->delete();

        AuditLog::record($request->user()->user_id, 'delete_lesson', ['lesson_id' => $id]);

        return response()->json(['message' => 'Lesson deleted.']);
    }
}