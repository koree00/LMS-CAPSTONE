<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class GameController extends Controller
{
    // MASTER / TEACHER: list games
    public function index()
    {
        return DB::table('weekly_game')->orderByDesc('week_start')->get();
    }

    // MASTER: create a game (starts unvalidated)
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:160',
            'description' => 'nullable|string',
            'week_start' => 'required|date',
        ]);

        $week = Carbon::parse($data['week_start']);
        if (! $week->isMonday()) {
            return response()->json(['message' => 'week_start must be a Monday.'], 422);
        }

        $id = DB::table('weekly_game')->insertGetId([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'week_start' => $week->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ], 'game_id');

        AuditLog::record($request->user()->user_id, 'create_game', ['game_id' => $id]);

        return response()->json(DB::table('weekly_game')->where('game_id', $id)->first(), 201);
    }

    // MASTER: validate a game so students can play it
    public function validateGame(Request $request, int $id)
    {
        $game = DB::table('weekly_game')->where('game_id', $id)->first();
        abort_unless($game, 404);

        if ($game->validated_by) {
            return response()->json(['message' => 'Already validated.'], 409);
        }

        DB::table('weekly_game')->where('game_id', $id)->update([
            'validated_by' => $request->user()->user_id,
            'validated_at' => now(),
            'updated_at' => now(),
        ]);

        AuditLog::record($request->user()->user_id, 'validate_game', ['game_id' => $id]);

        return response()->json(['message' => 'Game validated.']);
    }

    // STUDENT: this week's validated game, plus my best score
    public function current(Request $request)
    {
        $game = $this->currentGame();
        if (! $game) {
            return response()->json(['message' => 'No game this week.'], 404);
        }

        $best = DB::table('game_attempt')
            ->where('game_id', $game->game_id)
            ->where('student_id', $request->user()->user_id)
            ->max('score');

        return response()->json(['game' => $game, 'best_score' => $best ?? 0]);
    }

    // STUDENT: submit an attempt
        public function attempt(Request $request)
    {
        $data = $request->validate(['score' => 'required|integer|min:0|max:100']);
        $studentId = $request->user()->user_id;

        $game = $this->currentGame();
        abort_unless($game, 404, 'No game this week.');

        $bestBefore = (int) DB::table('game_attempt')
            ->where('game_id', $game->game_id)
            ->where('student_id', $studentId)
            ->max('score');

        [$coins, $source] = $this->coinsFromEngine($data['score'], $bestBefore);

        $attemptId = DB::transaction(function () use ($game, $studentId, $data, $coins) {
            $attemptId = DB::table('game_attempt')->insertGetId([
                'game_id' => $game->game_id,
                'student_id' => $studentId,
                'score' => $data['score'],
                'coins_earned' => $coins,
            ], 'attempt_id');

            if ($coins > 0) {
                DB::table('coin_transaction')->insert([
                    'student_id' => $studentId,
                    'amount' => $coins,
                    'reason' => 'weekly_game',
                    'ref_id' => $attemptId,
                ]);
            }

            return $attemptId;
        });

        return response()->json([
            'attempt_id' => $attemptId,
            'score' => $data['score'],
            'coins_earned' => $coins,
            'balance' => $this->balance($studentId),
            'rules_source' => $source,
        ], 201);
    }

    // STUDENT: coin balance and recent history
    public function coins(Request $request)
    {
        $studentId = $request->user()->user_id;

        return response()->json([
            'balance' => $this->balance($studentId),
            'recent' => DB::table('coin_transaction')
                ->where('student_id', $studentId)
                ->orderByDesc('transaction_id')
                ->limit(20)
                ->get(),
        ]);
    }

       // Asks the Python engine; falls back to the basic formula if it's down
    private function coinsFromEngine(int $score, int $bestBefore): array
    {
        try {
            $res = Http::withHeaders(['X-Engine-Key' => config('services.engine.key')])
                ->timeout(3)
                ->post(config('services.engine.url') . '/score', [
                    'score' => $score,
                    'best_before' => $bestBefore,
                ]);

            if ($res->successful()) {
                return [(int) $res->json('coins'), 'engine'];
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return [max(0, intdiv($score, 10) - intdiv($bestBefore, 10)), 'fallback'];
    }
}