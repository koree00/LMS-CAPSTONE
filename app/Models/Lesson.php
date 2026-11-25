<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    public const SUBJECTS = ['Language', 'Reading & Literacy', 'Mathematics', 'GMRC', 'Makabansa'];

    protected $table = 'lesson';
    protected $primaryKey = 'lesson_id';
    protected $fillable = ['title', 'description', 'subject', 'level_no', 'is_unlocked'];
    protected $casts = ['is_unlocked' => 'boolean'];
}
