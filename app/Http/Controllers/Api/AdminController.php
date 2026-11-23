<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    // Audit log viewer, with optional filters
    public function auditLogs(Request $request)
    {
        $this->requireFlag($request, 'can_view_audit_logs');

        $request->validate([
            'action' => 'sometimes|string|max:120',
            'actor_user_id' => 'sometimes|integer',
            'from' => 'sometimes|date',
            'to' => 'sometimes|date',
        ]);

        $query = DB::table('audit_log as al')
            ->join('user_account as u', 'u.user_id', '=', 'al.actor_user_id')
            ->select('al.audit_id', 'al.actor_user_id', 'u.email as actor_email',
                     'al.action', 'al.details', 'al.created_at')
            ->orderByDesc('al.audit_id');

        if ($request->filled('action')) {
            $query->where('al.action', $request->input('action'));
        }
        if ($request->filled('actor_user_id')) {
            $query->where('al.actor_user_id', $request->integer('actor_user_id'));
        }
        if ($request->filled('from')) {
            $query->whereDate('al.created_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('al.created_at', '<=', $request->input('to'));
        }

        return $query->paginate(25)->through(function ($row) {
            if (is_string($row->details)) {
                $row->details = json_decode($row->details, true);
            }
            return $row;
        });
    }

    // Numbers for the dashboard
    public function summary(Request $request)
    {
        $this->requireFlag($request, 'can_export_analytics');

        $activeCount = fn (string $role) => DB::table('user_account as u')
            ->join('role as r', 'r.role_id', '=', 'u.role_id')
            ->where('r.name', $role)
            ->where('u.status', 'active')
            ->count();

        return response()->json([
            'accounts' => [
                'teachers' => $activeCount('teacher'),
                'students' => $activeCount('student'),
            ],
            'sections' => DB::table('section')->count(),
            'lessons' => [
                'total' => DB::table('lesson')->count(),
                'unlocked' => DB::table('lesson')->where('is_unlocked', true)->count(),
            ],
            'progress' => [
                'avg_completion' => round((float) DB::table('student_lesson_progress')->avg('completion_pct'), 2),
                'lessons_completed' => DB::table('student_lesson_progress')->where('completion_pct', '>=', 100)->count(),
            ],
            'games' => [
                'attempts' => DB::table('game_attempt')->count(),
                'avg_score' => round((float) DB::table('game_attempt')->avg('score'), 2),
            ],
            'coins' => [
                'issued' => (int) DB::table('coin_transaction')->where('amount', '>', 0)->sum('amount'),
                'spent' => abs((int) DB::table('coin_transaction')->where('amount', '<', 0)->sum('amount')),
            ],
            'rewards_claimed' => DB::table('student_reward')->count(),
        ]);
    }

    // CSV download of every student's progress
    public function exportProgress(Request $request)
    {
        $this->requireFlag($request, 'can_export_analytics');

        $rows = DB::select("
            SELECT
                sp.student_id,
                sp.nickname,
                COALESCE((
                    SELECT string_agg(s.section_name, '; ' ORDER BY s.section_name)
                    FROM section_student ss
                    JOIN section s ON s.section_id = ss.section_id
                    WHERE ss.student_id = sp.student_id
                ), '') AS sections,
                COUNT(p.progress_id) AS lessons_started,
                COALESCE(SUM(CASE WHEN p.completion_pct >= 100 THEN 1 ELSE 0 END), 0) AS lessons_completed,
                COALESCE(ROUND(AVG(p.completion_pct), 2), 0) AS avg_completion,
                MAX(p.last_played_at) AS last_played_at
            FROM student_profile sp
            LEFT JOIN student_lesson_progress p ON p.student_id = sp.student_id
            GROUP BY sp.student_id, sp.nickname
            ORDER BY sp.nickname
        ");

        AuditLog::record($request->user()->user_id, 'export_student_progress', ['rows' => count($rows)]);

        $filename = 'student-progress-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            $put = fn (array $line) => fputcsv($out, $line, ',', '"', '');

            $put(['student_id', 'nickname', 'sections', 'lessons_started',
                  'lessons_completed', 'avg_completion', 'last_played_at']);

            foreach ($rows as $r) {
                $put([
                    $r->student_id,
                    $this->csvSafe($r->nickname),
                    $this->csvSafe($r->sections),
                    $r->lessons_started,
                    $r->lessons_completed,
                    $r->avg_completion,
                    $r->last_played_at,
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    // Each Master Teacher has permission flags in the master_teacher table
    private function requireFlag(Request $request, string $flag): void
    {
        $allowed = DB::table('master_teacher')
            ->where('master_teacher_id', $request->user()->user_id)
            ->value($flag);

        abort_unless($allowed, 403, 'You do not have permission for this.');
    }

    // Stops Excel from running text like "=SUM(...)" typed into a nickname
    private function csvSafe(?string $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'" . $value : $value;
    }
}