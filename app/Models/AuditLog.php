<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'audit_log';
    protected $primaryKey = 'audit_id';
    public $timestamps = false;
    protected $fillable = ['actor_user_id', 'action', 'details'];
    protected $casts = ['details' => 'array', 'created_at' => 'datetime'];

    public static function record(int $actorId, string $action, ?array $details = null): void
    {
        static::create([
            'actor_user_id' => $actorId,
            'action' => $action,
            'details' => $details,
        ]);
    }
}