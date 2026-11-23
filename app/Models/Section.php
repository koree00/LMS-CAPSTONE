<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    protected $table = 'section';
    protected $primaryKey = 'section_id';
    protected $fillable = ['teacher_id', 'section_name'];

    public function students()
    {
        return $this->belongsToMany(
            UserAccount::class,
            'section_student',
            'section_id',
            'student_id',
            'section_id',
            'user_id'
        )->withPivot('joined_at');
    }
}