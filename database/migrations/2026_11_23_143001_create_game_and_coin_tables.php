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
    Schema::create('weekly_game', function (Blueprint $t) {
        $t->increments('game_id');
        $t->string('title', 160);
        $t->text('description')->nullable();
        $t->date('week_start');
        $t->unsignedInteger('validated_by')->nullable();
        $t->timestamp('validated_at')->nullable();
        $t->timestamps();
        $t->foreign('validated_by')->references('master_teacher_id')->on('master_teacher')->nullOnDelete();
    });

Schema::create('game_attempt', function (Blueprint $t) {
    $t->increments('attempt_id');
    $t->unsignedInteger('game_id');
    $t->unsignedInteger('student_id');
    $t->unsignedInteger('score');
    $t->unsignedInteger('coins_earned')->default(0);
    $t->timestamp('created_at')->useCurrent();
    $t->index(['game_id', 'student_id']);
    $t->foreign('game_id')->references('game_id')->on('weekly_game')->cascadeOnDelete();
    $t->foreign('student_id')->references('student_id')->on('student_profile')->cascadeOnDelete();
});

Schema::create('coin_transaction', function (Blueprint $t) {
    $t->increments('transaction_id');
    $t->unsignedInteger('student_id');
    $t->integer('amount'); // positive = earned, negative = spent
    $t->string('reason', 60);
    $t->unsignedInteger('ref_id')->nullable();
    $t->timestamp('created_at')->useCurrent();
    $t->index('student_id');
    $t->foreign('student_id')->references('student_id')->on('student_profile')->cascadeOnDelete();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('game_and_coin_tables');
    }
};
