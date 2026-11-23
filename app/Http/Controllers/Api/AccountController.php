<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\UserAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Section;

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
            'guardian_email' => 'required|email',
        ]);

        // Siblings can share a guardian Gmail, so the login email is generated
        $loginEmail = 'student-' . Str::lower(Str::random(8)) . '@sned.local';
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

    // List accounts by role (Master Teacher sees all; Teacher sees only own students)
    public function index(Request $request, string $role)
    {
        abort_unless(in_array($role, ['teacher', 'student'], true), 404);
        $actor = $request->user();

        if ($actor->role->name === 'teacher' && $role !== 'student') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = UserAccount::whereHas('role', fn ($q) => $q->where('name', $role))
            ->select('user_id', 'email', 'status', 'created_at');

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

            $query->whereIn('user_id', $ids);
        }
        return $query->paginate(25);
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