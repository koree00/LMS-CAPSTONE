<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\UserAccount;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InitialSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['master_teacher', 'teacher', 'student', 'sned_coordinator'] as $name) {
            Role::firstOrCreate(['name' => $name]);
        }

        $user = UserAccount::firstOrCreate(
            ['email' => 'master@example.com'],
            [
                'role_id' => Role::where('name', 'master_teacher')->value('role_id'),
                'password_hash' => 'ChangeMe123!',
            ]
        );

        DB::table('master_teacher')->insertOrIgnore([
            'master_teacher_id' => $user->user_id,
        ]);
    }
}