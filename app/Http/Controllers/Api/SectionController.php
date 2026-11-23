<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SectionController extends Controller
{
    // Teacher: own sections. Master Teacher: all (optionally ?teacher_id=)
    public function index(Request $request)
    {
        $user = $request->user();

        $query = DB::table('section as s')
            ->join('user_account as u', 'u.user_id', '=', 's.teacher_id')
            ->leftJoin('teacher_profile as tp', 'tp.teacher_id', '=', 's.teacher_id')
            ->selectRaw('s.section_id, s.section_name, s.teacher_id,
                COALESCE(tp.display_name, u.email) as teacher_name,
                (SELECT COUNT(*) FROM section_student ss WHERE ss.section_id = s.section_id) as students_count')
            ->orderBy('s.section_name');

        if ($user->role->name === 'teacher') {
            $query->where('s.teacher_id', $user->user_id);
        } elseif ($request->filled('teacher_id')) {
            $query->where('s.teacher_id', $request->integer('teacher_id'));
        }

        return $query->get();
    }

    // MASTER: create a section. No teacher_id means the Master Teacher keeps it.
    public function store(Request $request)
    {
        $data = $request->validate([
            'section_name' => 'required|string|max:100',
            'teacher_id' => 'sometimes|integer',
        ]);
        $user = $request->user();

        $ownerId = $data['teacher_id'] ?? $user->user_id;
        $this->assertCanOwn($ownerId);

        $section = Section::create([
            'teacher_id' => $ownerId,
            'section_name' => $data['section_name'],
        ]);

        AuditLog::record($user->user_id, 'create_section', [
            'section_id' => $section->section_id,
            'teacher_id' => $ownerId,
        ]);

        return response()->json($section, 201);
    }

    // MASTER: rename a section and/or assign it to a teacher (or to yourself)
    public function update(Request $request, int $id)
    {
        $section = Section::findOrFail($id);

        $data = $request->validate([
            'section_name' => 'sometimes|string|max:100',
            'teacher_id' => 'sometimes|integer',
        ]);

        if (isset($data['teacher_id'])) {
            $this->assertCanOwn($data['teacher_id']);
        }

        $oldOwner = $section->teacher_id;
        $section->update($data);

        AuditLog::record($request->user()->user_id, 'update_section', [
            'section_id' => $section->section_id,
            'changes' => array_keys($data),
            'previous_teacher_id' => $oldOwner,
        ]);

        return $section;
    }

    public function show(Request $request, int $id)
    {
        $section = $this->findAllowed($request, $id);

        $students = DB::table('section_student as ss')
            ->join('student_profile as sp', 'sp.student_id', '=', 'ss.student_id')
            ->where('ss.section_id', $section->section_id)
            ->select('sp.student_id', 'sp.nickname', 'ss.joined_at')
            ->get();

        return response()->json(['section' => $section, 'students' => $students]);
    }

    // MASTER: any student. TEACHER: only students they created, in their own section.
    public function addStudent(Request $request, int $id)
    {
        $section = $this->findAllowed($request, $id);
        $data = $request->validate(['student_id' => 'required|integer|exists:student_profile,student_id']);
        $user = $request->user();

        if ($user->role->name === 'teacher') {
            $owner = DB::table('student_profile')->where('student_id', $data['student_id'])
                ->value('created_by_teacher_id');
            abort_unless((int) $owner === $user->user_id, 403, 'Not your student.');
        }

        $added = DB::table('section_student')->insertOrIgnore([
            'section_id' => $section->section_id,
            'student_id' => $data['student_id'],
        ]);

        AuditLog::record($user->user_id, 'add_student_to_section', [
            'section_id' => $section->section_id,
            'student_id' => $data['student_id'],
        ]);

        return response()->json(['message' => $added ? 'Student added.' : 'Already in this section.']);
    }

    public function removeStudent(Request $request, int $id, int $studentId)
    {
        $section = $this->findAllowed($request, $id);

        DB::table('section_student')
            ->where('section_id', $section->section_id)
            ->where('student_id', $studentId)
            ->delete();

        AuditLog::record($request->user()->user_id, 'remove_student_from_section', [
            'section_id' => $section->section_id,
            'student_id' => $studentId,
        ]);

        return response()->json(['message' => 'Student removed.']);
    }

    // Teachers can only touch their own sections; the Master Teacher can touch any
    private function findAllowed(Request $request, int $id): Section
    {
        $section = Section::findOrFail($id);
        $user = $request->user();

        if ($user->role->name === 'teacher') {
            abort_unless($section->teacher_id === $user->user_id, 403, 'Forbidden.');
        }

        return $section;
    }

    // A section's owner must be an active teacher or Master Teacher
    private function assertCanOwn(int $userId): void
    {
        $ok = DB::table('user_account as u')
            ->join('role as r', 'r.role_id', '=', 'u.role_id')
            ->where('u.user_id', $userId)
            ->where('u.status', 'active')
            ->whereIn('r.name', ['teacher', 'master_teacher'])
            ->exists();

        abort_unless($ok, 422, 'That user cannot own a section.');
    }
}