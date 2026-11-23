<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SectionController extends Controller
{
public function up(): void
{
    Schema::create('section', function (Blueprint $t) {
        $t->increments('section_id');
        $t->unsignedInteger('teacher_id');
        $t->string('section_name', 100);
        $t->timestamps();
        $t->foreign('teacher_id')->references('user_id')->on('user_account');
    });

    Schema::create('section_student', function (Blueprint $t) {
        $t->unsignedInteger('section_id');
        $t->unsignedInteger('student_id');
        $t->timestamp('joined_at')->useCurrent();
        $t->primary(['section_id', 'student_id']);
        $t->foreign('section_id')->references('section_id')->on('section')->cascadeOnDelete();
        $t->foreign('student_id')->references('student_id')->on('student_profile')->cascadeOnDelete();
    });
}

public function down(): void
{
    Schema::dropIfExists('section_student');
    Schema::dropIfExists('section');
}}

