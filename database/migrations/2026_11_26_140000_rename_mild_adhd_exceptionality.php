<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Students saved earlier with the old label now read "ADHD" like the new ones
    public function up(): void
    {
        if (Schema::hasColumn('student_profile', 'exceptionality')) {
            DB::table('student_profile')
                ->where('exceptionality', 'Mild Attention-deficit/hyperactivity disorder (ADHD)')
                ->update(['exceptionality' => 'Attention-deficit/hyperactivity disorder (ADHD)']);
        }
    }

    public function down(): void
    {
        // The old wording is not restored
    }
};
