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
    Schema::create('lesson', function (Blueprint $t) {
        $t->increments('lesson_id');
        $t->string('title', 160);
        $t->text('description')->nullable();
        $t->unsignedInteger('level_no');
        $t->boolean('is_unlocked')->default(false);
        $t->timestamps();
        $t->index('level_no');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lesson');
    }
};
