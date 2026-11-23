<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class UserAccount extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'user_account';
    protected $primaryKey = 'user_id';
    protected $fillable = ['role_id', 'email', 'password_hash', 'status'];
    protected $hidden = ['password_hash', 'totp_secret', 'recovery_codes'];

    protected function casts(): array
    {
        return [
            'password_hash' => 'hashed',
            'totp_secret' => 'encrypted',
            'recovery_codes' => 'encrypted:array',
            'totp_confirmed_at' => 'datetime',
        ];
    }

    public function getAuthPassword() { return $this->password_hash; }

    public function role() { return $this->belongsTo(Role::class, 'role_id', 'role_id'); }
}