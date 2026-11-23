<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('sned_coordinator');

        DB::table('role')->where('name', 'sned_coordinator')->delete();
    }

    public function down(): void
    {
        DB::table('role')->insertOrIgnore(['name' => 'sned_coordinator']);

        Schema::create('sned_coordinator', function (Blueprint $t) {
            $t->unsignedInteger('coordinator_id')->primary();
            $t->string('display_name', 120);
            $t->foreign('coordinator_id')->references('user_id')->on('user_account')->cascadeOnDelete();
        });
    }
};