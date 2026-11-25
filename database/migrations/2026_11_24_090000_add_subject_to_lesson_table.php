<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson', function (Blueprint $t) {
            // Key the web app uses to pick the game, e.g. "filipino", "math"
            $t->string('subject', 40)->nullable()->after('title');
            // DepEd MELC code, e.g. F1WG-Ia-1.1
            $t->string('competency', 60)->nullable()->after('subject');
        });
    }

    public function down(): void
    {
        Schema::table('lesson', function (Blueprint $t) {
            $t->dropColumn(['subject', 'competency']);
        });
    }
};
