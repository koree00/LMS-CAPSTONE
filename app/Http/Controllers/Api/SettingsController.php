<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class SettingsController extends Controller
{
    private const DEFAULT_PREFS = [
        'reduced_motion' => false,
        'sound' => true,
        'high_contrast' => false,
        'text_size' => 'medium',
        'theme' => 'calm',
    ];

    // STUDENT: avatars to choose from
    public function avatars()
    {
        return DB::table('avatar')
            ->where('is_active', true)
            ->orderBy('avatar_id')
            ->select('avatar_id', 'name', 'image_key')
            ->get();
    }

    // STUDENT: my settings
    public function profile(Request $request)
    {
        return response()->json($this->loadProfile($request->user()->user_id));
    }

    // STUDENT: update nickname, avatar, sensory preferences (send only what changed)
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'nickname' => 'sometimes|string|min:1|max:60',
            'avatar_id' => ['sometimes', 'nullable', 'integer',
                Rule::exists('avatar', 'avatar_id')->where('is_active', true)],
            'sensory_preferences' => 'sometimes|array',
            'sensory_preferences.reduced_motion' => 'sometimes|boolean',
            'sensory_preferences.sound' => 'sometimes|boolean',
            'sensory_preferences.high_contrast' => 'sometimes|boolean',
            'sensory_preferences.text_size' => 'sometimes|in:small,medium,large',
            'sensory_preferences.theme' => 'sometimes|in:calm,light,dark',
        ]);

        $studentId = $request->user()->user_id;
        $updates = [];

        if (array_key_exists('nickname', $data)) {
            $updates['nickname'] = trim($data['nickname']);
        }
        if (array_key_exists('avatar_id', $data)) {
            $updates['avatar_id'] = $data['avatar_id'];
        }
        if (isset($data['sensory_preferences'])) {
            $current = $this->loadProfile($studentId)['sensory_preferences'];
            $updates['sensory_preferences'] = json_encode(
                array_merge($current, $data['sensory_preferences'])
            );
        }

        if ($updates) {
            DB::table('student_profile')->where('student_id', $studentId)->update($updates);
        }

        return response()->json($this->loadProfile($studentId));
    }

    // ALL ROLES: change my own password
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'new_password' => ['required', 'string', 'confirmed', 'different:current_password',
                Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password_hash)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->password_hash = $data['new_password']; // hashed by the model cast
        $user->save();

        // Sign out every other device; keep this one
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        AuditLog::record($user->user_id, 'change_password');

        return response()->json(['message' => 'Password changed.']);
    }

    private function loadProfile(int $studentId): array
    {
        $p = DB::table('student_profile as sp')
            ->leftJoin('avatar as a', 'a.avatar_id', '=', 'sp.avatar_id')
            ->where('sp.student_id', $studentId)
            ->select('sp.nickname', 'sp.avatar_id', 'a.name as avatar_name',
                     'a.image_key as avatar_key', 'sp.sensory_preferences')
            ->first();

        abort_unless($p, 404, 'Student profile not found.');

        $stored = is_string($p->sensory_preferences)
            ? (json_decode($p->sensory_preferences, true) ?: [])
            : [];

        return [
            'nickname' => $p->nickname,
            'avatar' => $p->avatar_id
                ? ['avatar_id' => $p->avatar_id, 'name' => $p->avatar_name, 'image_key' => $p->avatar_key]
                : null,
            'sensory_preferences' => array_merge(self::DEFAULT_PREFS, $stored),
        ];
    }
}