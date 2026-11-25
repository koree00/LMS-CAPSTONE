<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Section;
use App\Models\UserAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    // Master Teacher only: create a teacher, optionally with sections
    public function createTeacher(Request $request)
    {
        $actor = $request->user();

        if (! DB::table('master_teacher')->where('master_teacher_id', $actor->user_id)
                ->value('can_manage_teacher_accounts')) {
            return response()->json(['message' => 'Not allowed to manage teacher accounts.'], 403);
        }

        $data = $request->validate([
            'email' => 'required|email|unique:user_account,email',
            'display_name' => 'required|string|max:120',
            'section_ids' => 'sometimes|array',
            'section_ids.*' => 'integer|exists:section,section_id',
            'new_sections' => 'sometimes|array',
            'new_sections.*' => 'string|max:100',
        ]);

        $tempPassword = Str::password(12, symbols: false);

        $result = DB::transaction(function () use ($data, $tempPassword) {
            $user = UserAccount::create([
                'role_id' => Role::where('name', 'teacher')->value('role_id'),
                'email' => $data['email'],
                'password_hash' => $tempPassword,
            ]);
            DB::table('teacher_profile')->insert([
                'teacher_id' => $user->user_id,
                'display_name' => $data['display_name'],
            ]);

            $sectionIds = [];

            // Move existing sections to this teacher
            if (! empty($data['section_ids'])) {
                DB::table('section')
                    ->whereIn('section_id', $data['section_ids'])
                    ->update(['teacher_id' => $user->user_id, 'updated_at' => now()]);
                $sectionIds = array_merge($sectionIds, $data['section_ids']);
            }

            // Create brand-new sections already owned by this teacher
            foreach ($data['new_sections'] ?? [] as $name) {
                $sectionIds[] = Section::create([
                    'teacher_id' => $user->user_id,
                    'section_name' => $name,
                ])->section_id;
            }

            return [$user, $sectionIds];
        });

        [$user, $sectionIds] = $result;

        AuditLog::record($actor->user_id, 'create_teacher', [
            'user_id' => $user->user_id,
            'section_ids' => $sectionIds,
        ]);

        return response()->json([
            'user_id' => $user->user_id,
            'email' => $user->email,
            'temporary_password' => $tempPassword, // shown once
            'section_ids' => $sectionIds,
        ], 201);
    }

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

            $profile = [
                'student_id' => $user->user_id,
                'nickname' => $data['nickname'],
                'guardian_email' => $loginEmail,
                'created_by_teacher_id' => $isMaster ? null : $actor->user_id,
            ];
            if (Schema::hasColumn('student_profile', 'exceptionality')) {
                $profile['exceptionality'] = $data['exceptionality'] ?? null;
            }
            DB::table('student_profile')->insert($profile);

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

        // Works before and after the exceptionality / display_nickname columns exist
        $exceptionality = Schema::hasColumn('student_profile', 'exceptionality')
            ? 'sp.exceptionality'
            : 'NULL';

        $displayNickname = Schema::hasColumn('student_profile', 'display_nickname')
            ? 'sp.display_nickname'
            : 'NULL';

        $query = DB::table('user_account as u')
            ->join('role as r', 'r.role_id', '=', 'u.role_id')
            ->leftJoin('teacher_profile as tp', 'tp.teacher_id', '=', 'u.user_id')
            ->leftJoin('student_profile as sp', 'sp.student_id', '=', 'u.user_id')
            ->whereIn('r.name', $role === 'all' ? ['teacher', 'student'] : [$role])
            ->selectRaw("
                u.user_id, u.email, u.status, u.created_at,
                r.name AS role,
                COALESCE(tp.display_name, sp.nickname) AS name,
                sp.nickname AS nickname,
                {$displayNickname} AS display_nickname,
                sp.guardian_email,
                {$exceptionality} AS exceptionality,
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

    // Master Teacher or Teacher: set or clear a student's exceptionality
    public function setExceptionality(Request $request, int $studentId)
    {
        abort_unless(
            Schema::hasColumn('student_profile', 'exceptionality'),
            503,
            'Please run the latest database update first (php artisan migrate).'
        );

        $data = $request->validate(['exceptionality' => 'nullable|string|max:120']);
        $actor = $request->user();

        abort_unless(DB::table('student_profile')->where('student_id', $studentId)->exists(), 404);

        if ($actor->role->name === 'teacher') {
            $mine = DB::table('student_profile')
                    ->where('student_id', $studentId)
                    ->where('created_by_teacher_id', $actor->user_id)
                    ->exists()
                || DB::table('section_student as ss')
                    ->join('section as s', 's.section_id', '=', 'ss.section_id')
                    ->where('ss.student_id', $studentId)
                    ->where('s.teacher_id', $actor->user_id)
                    ->exists();

            abort_unless($mine, 403, 'Forbidden.');
        } else {
            abort_unless(
                DB::table('master_teacher')->where('master_teacher_id', $actor->user_id)
                    ->value('can_manage_student_accounts'),
                403,
                'Not allowed to manage student accounts.'
            );
        }

        $value = trim((string) ($data['exceptionality'] ?? ''));
        $value = $value === '' ? null : $value;

        DB::table('student_profile')->where('student_id', $studentId)->update(['exceptionality' => $value]);

        AuditLog::record($actor->user_id, 'update_student_exceptionality', ['student_id' => $studentId]);

        return response()->json(['message' => 'Updated.', 'exceptionality' => $value]);
    }

    // Enable / disable an account
    public function setStatus(Request $request, int $userId)
    {
        $data = $request->validate(['status' => 'required|in:active,disabled']);
        $actor = $request->user();
        $target = UserAccount::with('role')->findOrFail($userId);

        $allowed = match ($actor->role->name) {
            'master_teacher' => in_array($target->role->name, ['teacher', 'student'], true),
            'teacher' => $target->role->name === 'student' && DB::table('student_profile')
                ->where('student_id', $target->user_id)
                ->where('created_by_teacher_id', $actor->user_id)->exists(),
            default => false,
        };

        abort_unless($allowed, 403, 'Forbidden.');

        $target->update(['status' => $data['status']]);
        if ($data['status'] === 'disabled') {
            $target->tokens()->delete(); // kick them out immediately
        }

        AuditLog::record($actor->user_id, 'set_status_' . $data['status'], ['user_id' => $target->user_id]);

        return response()->json(['message' => 'Updated.']);
    }
}