<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// The "avatar shop": items students buy with stars
class RewardController extends Controller
{
    // Students: active items with an "owned" flag. Staff: every item.
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role->name === 'student') {
            return DB::table('reward as r')
                ->leftJoin('student_reward as sr', function ($join) use ($user) {
                    $join->on('sr.reward_id', '=', 'r.reward_id')
                         ->where('sr.student_id', '=', $user->user_id);
                })
                ->where('r.is_active', true)
                ->orderBy('r.cost_coins')
                ->selectRaw('r.reward_id, r.reward_name, r.description, r.emoji, r.cost_coins,
                             (sr.student_reward_id IS NOT NULL) as owned')
                ->get();
        }

        return DB::table('reward')->orderBy('cost_coins')->get();
    }

    // MASTER
    public function store(Request $request)
    {
        $data = $request->validate([
            'reward_name' => 'required|string|max:120',
            'description' => 'nullable|string',
            'emoji' => 'nullable|string|max:16',
            'cost_coins' => 'required|integer|min:1',
        ]);

        $id = DB::table('reward')->insertGetId($data + [
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'reward_id');

        AuditLog::record($request->user()->user_id, 'create_reward', ['reward_id' => $id]);

        return response()->json(DB::table('reward')->where('reward_id', $id)->first(), 201);
    }

    // MASTER
    public function update(Request $request, int $id)
    {
        abort_unless(DB::table('reward')->where('reward_id', $id)->exists(), 404);

        $data = $request->validate([
            'reward_name' => 'sometimes|string|max:120',
            'description' => 'nullable|string',
            'emoji' => 'nullable|string|max:16',
            'cost_coins' => 'sometimes|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        DB::table('reward')->where('reward_id', $id)->update($data + ['updated_at' => now()]);

        AuditLog::record($request->user()->user_id, 'update_reward', [
            'reward_id' => $id,
            'changes' => array_keys($data),
        ]);

        return DB::table('reward')->where('reward_id', $id)->first();
    }

    // STUDENT: spend stars to buy an item
    public function claim(Request $request, int $id)
    {
        $studentId = $request->user()->user_id;

        $reward = DB::table('reward')->where('reward_id', $id)->where('is_active', true)->first();
        abort_unless($reward, 404, 'Item not found.');

        return DB::transaction(function () use ($studentId, $reward) {
            // Lock this student's row so two quick taps cannot spend the same stars twice
            DB::table('student_profile')->where('student_id', $studentId)->lockForUpdate()->first();

            if (DB::table('student_reward')
                ->where('student_id', $studentId)->where('reward_id', $reward->reward_id)->exists()) {
                return response()->json(['message' => 'You already have this item.'], 409);
            }

            $balance = (int) DB::table('coin_transaction')->where('student_id', $studentId)->sum('amount');

            if ($balance < $reward->cost_coins) {
                return response()->json([
                    'message' => 'Not enough stars.',
                    'balance' => $balance,
                    'cost_coins' => $reward->cost_coins,
                ], 422);
            }

            $claimId = DB::table('student_reward')->insertGetId([
                'student_id' => $studentId,
                'reward_id' => $reward->reward_id,
            ], 'student_reward_id');

            DB::table('coin_transaction')->insert([
                'student_id' => $studentId,
                'amount' => -$reward->cost_coins,
                'reason' => 'reward_claim',
                'ref_id' => $claimId,
            ]);

            return response()->json([
                'message' => 'You got the ' . $reward->reward_name . '!',
                'reward' => $reward->reward_name,
                'balance' => $balance - $reward->cost_coins,
            ], 201);
        });
    }

    // STUDENT: items I own
    public function mine(Request $request)
    {
        return $this->claimedBy($request->user()->user_id);
    }

    // TEACHER / MASTER: items a student owns
    public function forStudent(Request $request, int $studentId)
    {
        abort_unless(DB::table('student_profile')->where('student_id', $studentId)->exists(), 404);
        $user = $request->user();

        if ($user->role->name === 'teacher') {
            $allowed = DB::table('student_profile')
                    ->where('student_id', $studentId)
                    ->where('created_by_teacher_id', $user->user_id)->exists()
                || DB::table('section_student as ss')
                    ->join('section as s', 's.section_id', '=', 'ss.section_id')
                    ->where('ss.student_id', $studentId)
                    ->where('s.teacher_id', $user->user_id)->exists();

            abort_unless($allowed, 403, 'Forbidden.');
        }

        return $this->claimedBy($studentId);
    }

    private function claimedBy(int $studentId)
    {
        return DB::table('student_reward as sr')
            ->join('reward as r', 'r.reward_id', '=', 'sr.reward_id')
            ->where('sr.student_id', $studentId)
            ->orderByDesc('sr.claimed_at')
            ->select('r.reward_id', 'r.reward_name', 'r.emoji', 'r.cost_coins', 'sr.claimed_at')
            ->get();
    }
}
