<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Staff profile: a title (Mr./Ms./Mrs.), a name, and a small profile picture.
    // They live on user_account so Master Teachers (who have no teacher_profile row) can use them too.
    public function up(): void
    {
        foreach ([
            'title' => fn (Blueprint $t) => $t->string('title', 10)->nullable(),
            'display_name' => fn (Blueprint $t) => $t->string('display_name', 120)->nullable(),
            'profile_photo' => fn (Blueprint $t) => $t->text('profile_photo')->nullable(), // small data URL
        ] as $column => $add) {
            if (! Schema::hasColumn('user_account', $column)) {
                Schema::table('user_account', fn (Blueprint $t) => $add($t));
            }
        }
    }

    public function down(): void
    {
        foreach (['title', 'display_name', 'profile_photo'] as $column) {
            if (Schema::hasColumn('user_account', $column)) {
                Schema::table('user_account', fn (Blueprint $t) => $t->dropColumn($column));
            }
        }
    }
};
