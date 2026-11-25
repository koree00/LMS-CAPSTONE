<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. The name a student picks for themselves. Staff keep seeing the name
        //    the teacher entered (student_profile.nickname), so a student can never
        //    change what appears in the teacher's student list.
        if (! Schema::hasColumn('student_profile', 'display_nickname')) {
            Schema::table('student_profile', function (Blueprint $t) {
                $t->string('display_nickname', 60)->nullable();
            });
        }

        // 2. The day (1 to 5) each lesson is played on within its level
        if (! Schema::hasColumn('lesson', 'day_no')) {
            Schema::table('lesson', function (Blueprint $t) {
                $t->unsignedSmallInteger('day_no')->nullable();
            });
        }

        // 3. Make sure every lesson has one of the five subjects
        if (Schema::hasColumn('lesson', 'subject')) {
            $five = ['Language', 'Reading & Literacy', 'Mathematics', 'GMRC', 'Makabansa'];
            $map = [
                'language' => 'Language', 'mother tongue' => 'Language', 'mother_tongue' => 'Language',
                'filipino' => 'Language', 'english' => 'Language',
                'reading & literacy' => 'Reading & Literacy', 'reading and literacy' => 'Reading & Literacy',
                'reading' => 'Reading & Literacy',
                'mathematics' => 'Mathematics', 'math' => 'Mathematics',
                'gmrc' => 'GMRC',
                'makabansa' => 'Makabansa', 'mapeh' => 'Makabansa', 'epp/tle' => 'Makabansa',
                'epp' => 'Makabansa', 'tle' => 'Makabansa', 'science' => 'Makabansa',
            ];

            foreach (DB::table('lesson')->get() as $lesson) {
                if (in_array($lesson->subject, $five, true)) {
                    continue;
                }

                $candidates = [
                    strtolower(trim((string) $lesson->subject)),
                    strtolower(trim(Str::before($lesson->title, ':'))),
                ];

                $subject = null;
                foreach ($candidates as $c) {
                    if ($c !== '' && isset($map[$c])) {
                        $subject = $map[$c];
                        break;
                    }
                }

                DB::table('lesson')
                    ->where('lesson_id', $lesson->lesson_id)
                    ->update(['subject' => $subject ?? 'Language']);
            }
        }

        // 4. Spread each level's lessons evenly over Day 1 to Day 5 (in lesson order)
        foreach (DB::table('lesson')->distinct()->pluck('level_no') as $level) {
            $ids = DB::table('lesson')->where('level_no', $level)->orderBy('lesson_id')->pluck('lesson_id')->values();
            $count = $ids->count();

            foreach ($ids as $i => $id) {
                DB::table('lesson')->where('lesson_id', $id)->update(['day_no' => intdiv($i * 5, $count) + 1]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('lesson', 'day_no')) {
            Schema::table('lesson', function (Blueprint $t) {
                $t->dropColumn('day_no');
            });
        }
        if (Schema::hasColumn('student_profile', 'display_nickname')) {
            Schema::table('student_profile', function (Blueprint $t) {
                $t->dropColumn('display_nickname');
            });
        }
    }
};
