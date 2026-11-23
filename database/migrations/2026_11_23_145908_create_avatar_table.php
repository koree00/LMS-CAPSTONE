<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
    Schema::create('avatar', function (Blueprint $t) {
        $t->increments('avatar_id');
        $t->string('name', 60);
        $t->string('image_key', 60)->unique();
        $t->boolean('is_active')->default(true);
});

DB::table('avatar')->insert([
    ['name' => 'Fox',    'image_key' => 'fox'],
    ['name' => 'Panda',  'image_key' => 'panda'],
    ['name' => 'Owl',    'image_key' => 'owl'],
    ['name' => 'Bunny',  'image_key' => 'bunny'],
    ['name' => 'Turtle', 'image_key' => 'turtle'],
    ['name' => 'Lion',   'image_key' => 'lion'],
]);

Schema::table('student_profile', function (Blueprint $t) {
    $t->foreign('avatar_id')->references('avatar_id')->on('avatar')->nullOnDelete();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    Schema::table('student_profile', function (Blueprint $t) {
        $t->dropForeign(['avatar_id']);
});
Schema::dropIfExists('avatar');
    }
};
