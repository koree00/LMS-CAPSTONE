<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Grade 1, Week 1 lessons (Level 1), one per subject.
// Safe to run more than once: rows are matched by subject + level.
class Grade1Level1Seeder extends Seeder
{
    public function run(): void
    {
        $lessons = [
            [
                'subject' => 'filipino',
                'title' => 'Filipino: Pagkilala sa mga Pantig',
                'competency' => 'F1WG-Ia-1.1',
                'description' => "Nababasa ang mga salitang may pantig na CV (consonant-vowel).\nNaiuugnay ang tunog ng letra sa salita (e.g., a - aso, b - bola).\nNakikilahok sa pagbabasa ng maiikling salita.",
            ],
            [
                'subject' => 'english',
                'title' => 'English: Reading CVC Words',
                'competency' => 'EN1PR-Ia-1.1',
                'description' => "Recognize and read CVC words (e.g., cat, dog, bat).\nMatch pictures to corresponding words.\nParticipate in oral reading activities.",
            ],
            [
                'subject' => 'math',
                'title' => 'Mathematics: Numbers 1-20',
                'competency' => 'M1NS-Ia-1.1',
                'description' => "Count and write numbers from 1 to 20.\nIdentify numbers before, after, and between.\nRepresent numbers using objects.",
            ],
            [
                'subject' => 'science',
                'title' => 'Science: The Five Senses',
                'competency' => 'S1LT-Ia-1.1',
                'description' => "Identify the five senses and their functions.\nUse body parts to describe surroundings.\nParticipate in sensory activities.",
            ],
            [
                'subject' => 'gmrc',
                'title' => 'GMRC: Basic Respect and Listening Skills',
                'competency' => 'GMRC1-RE-Ia-1.1',
                'description' => "Show respect by saying 'po' and 'opo'.\nPractice good manners during group work.\nListen attentively when others speak.",
            ],
            [
                'subject' => 'makabansa',
                'title' => 'Makabansa: National Symbols and Identity',
                'competency' => 'MKBS1-NS-Ia-1.1',
                'description' => "Identify the Philippine flag and recite 'Ako ay Pilipino'.\nShow love and respect for national symbols.\nParticipate in the flag ceremony.",
            ],
            [
                'subject' => 'mapeh',
                'title' => 'MAPEH: Rhythmic Movement and Color Use',
                'competency' => 'MAPEH1-MU-Ia-1.1 / AR1-Ia-1.1',
                'description' => "Follow simple movement directions to music.\nIdentify colors and use them creatively in artwork.\nParticipate in singing short melodic patterns.",
            ],
            [
                'subject' => 'epp',
                'title' => 'EPP/TLE: Self-care and Hygiene',
                'competency' => 'EPP1-HE-Ia-1.1',
                'description' => "Demonstrate proper handwashing steps.\nParticipate in basic self-care and home tasks.\nIdentify personal hygiene tools.",
            ],
            [
                'subject' => 'mother_tongue',
                'title' => 'Mother Tongue: Pagpapakilala sa Sarili',
                'competency' => 'MTB1-SS-Ia-1.1',
                'description' => "Recognize and read basic words in the mother tongue.\nUse familiar expressions to describe oneself.\nParticipate in storytelling using local language.",
            ],
        ];

        foreach ($lessons as $lesson) {
            $existing = DB::table('lesson')
                ->where('subject', $lesson['subject'])
                ->where('level_no', 1)
                ->first();

            if ($existing) {
                DB::table('lesson')->where('lesson_id', $existing->lesson_id)->update($lesson + ['updated_at' => now()]);
            } else {
                DB::table('lesson')->insert($lesson + [
                    'level_no' => 1,
                    'is_unlocked' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
