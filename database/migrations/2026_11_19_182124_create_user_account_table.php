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
    Schema::create('user_account', function (Blueprint $t) {
        $t->increments('user_id');
        $t->unsignedInteger('role_id');
        $t->string('email', 255)->unique();
        $t->string('password_hash', 255);
        $t->string('status', 30)->default('active'); // active | disabled
        $t->text('totp_secret')->nullable();
        $t->timestamp('totp_confirmed_at')->nullable();
        $t->text('recovery_codes')->nullable();
        $t->timestamps();
        $t->foreign('role_id')->references('role_id')->on('role');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_account');
    }
};
