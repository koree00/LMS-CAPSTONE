<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    protected $table = 'lesson';
    protected $primaryKey = 'lesson_id';
    protected $fillable = ['title', 'description', 'level_no', 'is_unlocked'];
    protected $casts = ['is_unlocked' => 'boolean'];
}