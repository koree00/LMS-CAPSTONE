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
    Schema::create('audit_log', function (Blueprint $t) {
        $t->increments('audit_id');
        $t->unsignedInteger('actor_user_id');
        $t->string('action', 120);
        $t->json('details')->nullable();
        $t->timestamp('created_at')->useCurrent();
        $t->foreign('actor_user_id')->references('user_id')->on('user_account');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_log');
    }
};
