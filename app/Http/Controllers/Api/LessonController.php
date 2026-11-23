<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Lesson;
use Illuminate\Http\Request;

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

        return $query->get();
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
            'level_no' => 'required|integer|min:1',
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
            'level_no' => 'sometimes|integer|min:1',
            'is_unlocked' => 'sometimes|boolean',
        ]);

        $lesson->update($data);

        AuditLog::record($request->user()->user_id, 'update_lesson', [
            'lesson_id' => $lesson->lesson_id,
            'changes' => array_keys($data),
        ]);

        return $lesson;
    }

    public function destroy(Request $request, int $id)
    {
        $lesson = Lesson::findOrFail($id);
        $lesson->delete();

        AuditLog::record($request->user()->user_id, 'delete_lesson', ['lesson_id' => $id]);

        return response()->json(['message' => 'Lesson deleted.']);
    }
}