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
    Schema::create('reward', function (Blueprint $t) {
        $t->increments('reward_id');
        $t->string('reward_name', 120);
        $t->text('description')->nullable();
        $t->unsignedInteger('cost_coins');
        $t->boolean('is_active')->default(true);
        $t->timestamps();
});

Schema::create('student_reward', function (Blueprint $t) {
    $t->increments('student_reward_id');
    $t->unsignedInteger('student_id');
    $t->unsignedInteger('reward_id');
    $t->timestamp('claimed_at')->useCurrent();
    $t->unique(['student_id', 'reward_id']);
    $t->foreign('student_id')->references('student_id')->on('student_profile')->cascadeOnDelete();
    $t->foreign('reward_id')->references('reward_id')->on('reward')->cascadeOnDelete();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reward_tables');
    }
};
