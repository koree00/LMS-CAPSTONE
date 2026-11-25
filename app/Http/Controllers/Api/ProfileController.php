<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\UserAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProfileController extends Controller
{
    private const MAX_PHOTO_BYTES = 300 * 1024; // the web app sends a ~256px picture, far below this
    private const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    // The signed-in user, plus the staff profile fields the web app shows
    public static function present(UserAccount $user): array
    {
        $user->loadMissing('role');

        $name = $user->display_name
            ?: DB::table('teacher_profile')->where('teacher_id', $user->user_id)->value('display_name');
        $title = $user->title;

        return array_merge(Arr::except($user->toArray(), ['profile_photo']), [
            'name' => $name,
            'title' => $title,
            'full_name' => $name ? trim(($title ? $title . ' ' : '') . $name) : null,
            'photo' => $user->profile_photo,
        ]);
    }

    // MASTER TEACHER / TEACHER: change my title, name and profile picture
    public function update(Request $request)
    {
        abort_unless(
            Schema::hasColumn('user_account', 'display_name'),
            503,
            'Please run the latest database update first (php artisan migrate).'
        );

        $data = $request->validate([
            'title' => 'required|in:Mr.,Ms.,Mrs.',
            'display_name' => ['required', 'string', 'min:2', 'max:100',
                "regex:/^[\\p{L}\\p{M}][\\p{L}\\p{M}\\s.'’-]*$/u"],
            'photo' => 'sometimes|nullable|string',
            'remove_photo' => 'sometimes|boolean',
        ], [
            'display_name.regex' => 'Names can only use letters, spaces, and . \' -',
        ]);

        $user = $request->user();
        $name = preg_replace('/\s+/', ' ', trim($data['display_name']));

        $updates = ['title' => $data['title'], 'display_name' => $name];
        $changed = ['title', 'display_name'];

        if (! empty($data['photo'])) {
            $updates['profile_photo'] = $this->checkedPhoto($data['photo']);
            $changed[] = 'photo';
        } elseif (! empty($data['remove_photo'])) {
            $updates['profile_photo'] = null;
            $changed[] = 'photo_removed';
        }

        DB::transaction(function () use ($user, $updates, $data, $name) {
            $user->forceFill($updates)->save();

            // Other pages (user lists, sections) read the teacher's name from teacher_profile
            DB::table('teacher_profile')
                ->where('teacher_id', $user->user_id)
                ->update(['display_name' => trim($data['title'] . ' ' . $name)]);
        });

        AuditLog::record($user->user_id, 'update_profile', ['fields' => $changed]);

        return response()->json([
            'message' => 'Profile saved.',
            'user' => self::present($user->fresh()),
        ]);
    }

    // Accepts only a small JPEG/PNG/WebP data URL, and checks the bytes really are that image
    private function checkedPhoto(string $dataUrl): string
    {
        $bad = fn (string $why) => abort(422, $why);

        if (! preg_match('#^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$#', $dataUrl, $m)) {
            $bad('Please choose a JPG, PNG or WebP picture.');
        }

        $bytes = base64_decode($m[2], true);
        if ($bytes === false || strlen($bytes) > self::MAX_PHOTO_BYTES) {
            $bad('That picture is too large. Please choose a smaller one.');
        }

        $info = @getimagesizefromstring($bytes);
        if (! $info || ! in_array($info['mime'], self::PHOTO_TYPES, true) || $info['mime'] !== $m[1]) {
            $bad('That file is not a valid picture.');
        }

        return $dataUrl;
    }
}
