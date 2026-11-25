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
        // 1. Every lesson belongs to one of the five Grade 1 subjects
        if (! Schema::hasColumn('lesson', 'subject')) {
            Schema::table('lesson', function (Blueprint $t) {
                $t->string('subject', 40)->nullable();
            });
        }

        // Fold the old subject names into the five curriculum subjects.
        // Change a line here if you want a different home for a subject.
        $map = [
            'language' => 'Language',
            'mother tongue' => 'Language',
            'filipino' => 'Language',
            'english' => 'Language',
            'reading & literacy' => 'Reading & Literacy',
            'reading and literacy' => 'Reading & Literacy',
            'reading' => 'Reading & Literacy',
            'mathematics' => 'Mathematics',
            'math' => 'Mathematics',
            'gmrc' => 'GMRC',
            'makabansa' => 'Makabansa',
            'mapeh' => 'Makabansa',
            'epp/tle' => 'Makabansa',
            'epp' => 'Makabansa',
            'tle' => 'Makabansa',
            'science' => 'Makabansa',
        ];

        foreach (DB::table('lesson')->get() as $lesson) {
            $candidates = [
                strtolower(trim((string) ($lesson->subject ?? ''))),
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

        // 2. Avatar shop items can show an emoji on the avatar
        if (! Schema::hasColumn('reward', 'emoji')) {
            Schema::table('reward', function (Blueprint $t) {
                $t->string('emoji', 16)->nullable();
            });
        }

        // 3. The item a student is currently wearing
        if (! Schema::hasColumn('student_profile', 'equipped_reward_id')) {
            Schema::table('student_profile', function (Blueprint $t) {
                $t->unsignedInteger('equipped_reward_id')->nullable();
                $t->foreign('equipped_reward_id')->references('reward_id')->on('reward')->nullOnDelete();
            });
        }

        // A few starter items if the shop is empty
        if (DB::table('reward')->count() === 0) {
            $now = now();
            foreach ([
                ['Top Hat', '🎩', 10],
                ['Bow', '🎀', 10],
                ['Cool Shades', '🕶️', 15],
                ['Crown', '👑', 30],
            ] as [$name, $emoji, $cost]) {
                DB::table('reward')->insert([
                    'reward_name' => $name,
                    'emoji' => $emoji,
                    'cost_coins' => $cost,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('student_profile', 'equipped_reward_id')) {
            Schema::table('student_profile', function (Blueprint $t) {
                $t->dropForeign(['equipped_reward_id']);
                $t->dropColumn('equipped_reward_id');
            });
        }
        if (Schema::hasColumn('reward', 'emoji')) {
            Schema::table('reward', function (Blueprint $t) {
                $t->dropColumn('emoji');
            });
        }
    }
};
