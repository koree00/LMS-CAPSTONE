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
    Schema::create('teacher_profile', function (Blueprint $t) {
        $t->unsignedInteger('teacher_id')->primary();
        $t->string('display_name', 120);
        $t->foreign('teacher_id')->references('user_id')->on('user_account')->cascadeOnDelete();
});

Schema::create('master_teacher', function (Blueprint $t) {
    $t->unsignedInteger('master_teacher_id')->primary();
    $t->boolean('can_manage_teacher_accounts')->default(true);
    $t->boolean('can_manage_student_accounts')->default(true);
    $t->boolean('can_view_audit_logs')->default(true);
    $t->boolean('can_export_analytics')->default(true);
    $t->foreign('master_teacher_id')->references('user_id')->on('user_account')->cascadeOnDelete();
});


Schema::create('student_profile', function (Blueprint $t) {
    $t->unsignedInteger('student_id')->primary();
    $t->string('nickname', 60);
    $t->string('guardian_email', 255)->nullable();
    $t->unsignedInteger('created_by_teacher_id')->nullable();
    $t->unsignedInteger('avatar_id')->nullable(); // FK added when we make the avatar table
    $t->json('sensory_preferences')->nullable();
    $t->foreign('student_id')->references('user_id')->on('user_account')->cascadeOnDelete();
    $t->foreign('created_by_teacher_id')->references('teacher_id')->on('teacher_profile')->nullOnDelete();
});
    }

    /**
     * Reverse the migrations.
     */
        public function down(): void
    {
        Schema::dropIfExists('student_profile');
        Schema::dropIfExists('master_teacher');
        Schema::dropIfExists('teacher_profile');
    }
};
