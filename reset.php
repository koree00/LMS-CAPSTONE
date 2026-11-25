<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

DB::transaction(function () {
    $master = DB::table('user_account as u')
        ->join('role as r', 'r.role_id', '=', 'u.role_id')
        ->where('r.name', 'master_teacher')
        ->pluck('u.user_id');

    if ($master->isEmpty()) {
        echo "No Master Teacher found. Nothing was changed.\n";
        return;
    }

    $others = DB::table('user_account')->whereNotIn('user_id', $master)->pluck('user_id');

    // Sections go first, so no account is still pointed to by one
    $sections = 0;
    if (Schema::hasTable('section_student')) {
        DB::table('section_student')->delete();
    }
    if (Schema::hasTable('section')) {
        $sections = DB::table('section')->count();
        DB::table('section')->delete();
    }

    if (Schema::hasTable('audit_log')) {
        DB::table('audit_log')->whereIn('actor_user_id', $others)->delete();
    }
    if (Schema::hasTable('personal_access_tokens')) {
        DB::table('personal_access_tokens')
            ->where('tokenable_type', App\Models\UserAccount::class)
            ->whereIn('tokenable_id', $others)
            ->delete();
    }

    // Profiles, progress, game attempts, stars, and avatar items are removed with the accounts
    DB::table('user_account')->whereIn('user_id', $others)->delete();

    echo "Removed {$others->count()} accounts and {$sections} sections. Kept {$master->count()} Master Teacher account(s).\n";
});