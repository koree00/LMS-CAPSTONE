<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('student_profile', 'exceptionality')) {
            Schema::table('student_profile', function (Blueprint $t) {
                $t->string('exceptionality', 120)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('student_profile', 'exceptionality')) {
            Schema::table('student_profile', function (Blueprint $t) {
                $t->dropColumn('exceptionality');
            });
        }
    }
};
