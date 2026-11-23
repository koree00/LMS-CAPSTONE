<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::table('section', function (Blueprint $t) {
        $t->dropForeign(['teacher_id']);
        $t->foreign('teacher_id')->references('user_id')->on('user_account');
    });
}

public function down(): void
{
    Schema::table('section', function (Blueprint $t) {
        $t->dropForeign(['teacher_id']);
        $t->foreign('teacher_id')->references('teacher_id')->on('teacher_profile');
    });
}
};
