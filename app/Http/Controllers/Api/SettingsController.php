<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
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

    private const UPDATE_NEEDED = 'Please run the latest database update first (php artisan migrate).';

    // STUDENT: animals to choose from
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

    // STUDENT: update my display name, animal, the item I wear, and sensory preferences
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'nickname' => 'sometimes|string|min:1|max:60',
            'avatar_id' => ['sometimes', 'nullable', 'integer',
                Rule::exists('avatar', 'avatar_id')->where('is_active', true)],
            'equipped_reward_id' => 'sometimes|nullable|integer',
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
            abort_unless(Schema::hasColumn('student_profile', 'display_nickname'), 503, self::UPDATE_NEEDED);

            // The student's own display name. The name teachers see is not touched.
            $updates['display_nickname'] = trim($data['nickname']);
        }
        if (array_key_exists('avatar_id', $data)) {
            $updates['avatar_id'] = $data['avatar_id'];
        }
        if (array_key_exists('equipped_reward_id', $data)) {
            abort_unless(Schema::hasColumn('student_profile', 'equipped_reward_id'), 503, self::UPDATE_NEEDED);

            $itemId = $data['equipped_reward_id'];

            if ($itemId !== null) {
                $owns = DB::table('student_reward')
                    ->where('student_id', $studentId)
                    ->where('reward_id', $itemId)
                    ->exists();
                abort_unless($owns, 422, 'You do not have that item yet.');
            }

            $updates['equipped_reward_id'] = $itemId;
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

    // Works before and after the latest migrations have run
    private function loadProfile(int $studentId): array
    {
        $hasName = Schema::hasColumn('student_profile', 'display_nickname');
        $hasItem = Schema::hasColumn('student_profile', 'equipped_reward_id') && Schema::hasColumn('reward', 'emoji');

        $query = DB::table('student_profile as sp')
            ->leftJoin('avatar as a', 'a.avatar_id', '=', 'sp.avatar_id')
            ->where('sp.student_id', $studentId);

        $columns = ['sp.nickname', 'sp.avatar_id', 'a.name as avatar_name',
                    'a.image_key as avatar_key', 'sp.sensory_preferences'];

        if ($hasName) {
            $columns[] = 'sp.display_nickname';
        }
        if ($hasItem) {
            $query->leftJoin('reward as r', 'r.reward_id', '=', 'sp.equipped_reward_id');
            array_push($columns, 'sp.equipped_reward_id', 'r.reward_name as item_name', 'r.emoji as item_emoji');
        }

        $p = $query->select($columns)->first();

        abort_unless($p, 404, 'Student profile not found.');

        $stored = is_string($p->sensory_preferences)
            ? (json_decode($p->sensory_preferences, true) ?: [])
            : [];

        return [
            'nickname' => ($hasName && $p->display_nickname) ? $p->display_nickname : $p->nickname,
            'avatar' => $p->avatar_id
                ? ['avatar_id' => $p->avatar_id, 'name' => $p->avatar_name, 'image_key' => $p->avatar_key]
                : null,
            'equipped' => ($hasItem && $p->equipped_reward_id)
                ? ['reward_id' => $p->equipped_reward_id, 'name' => $p->item_name, 'emoji' => $p->item_emoji]
                : null,
            'sensory_preferences' => array_merge(self::DEFAULT_PREFS, $stored),
        ];
    }
}
