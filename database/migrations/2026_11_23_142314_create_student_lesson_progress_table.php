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
    Schema::create('student_lesson_progress', function (Blueprint $t) {
        $t->increments('progress_id');
        $t->unsignedInteger('student_id');
        $t->unsignedInteger('lesson_id');
        $t->decimal('completion_pct', 5, 2)->default(0);
        $t->timestamp('last_played_at')->nullable();
        $t->unique(['student_id', 'lesson_id']);
        $t->foreign('student_id')->references('student_id')->on('student_profile')->cascadeOnDelete();
        $t->foreign('lesson_id')->references('lesson_id')->on('lesson')->cascadeOnDelete();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_lesson_progress');
    }
};
