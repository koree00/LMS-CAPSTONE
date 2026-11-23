<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    // Step 1 of login: email + password
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = UserAccount::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'This account is disabled.'], 403);
        }

        // TOTP already set up -> ask for the code
        if ($user->totp_confirmed_at) {
            $ticket = Str::random(60);
            Cache::put("login_ticket:$ticket", $user->user_id, now()->addMinutes(5));

            return response()->json([
                'needs_otp' => true,
                'ticket' => $ticket,
            ]);
        }

        // No TOTP yet: issue a token that can ONLY set up 2FA
        $token = $user->createToken('setup', ['2fa-setup'])->plainTextToken;

        return response()->json([
            'needs_setup' => true,
            'token' => $token,
        ]);
    }

    // Step 2 of login: the 6-digit code
    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'ticket' => 'required|string',
            'code' => 'required|digits:6',
        ]);

        $userId = Cache::get("login_ticket:{$data['ticket']}");
        $user = $userId ? UserAccount::find($userId) : null;

        if (! $user) {
            return response()->json(['message' => 'Login expired. Start again.'], 422);
        }

        if (! (new Google2FA())->verifyKey($user->totp_secret, $data['code'])) {
            return response()->json(['message' => 'Invalid code.'], 422);
        }

        Cache::forget("login_ticket:{$data['ticket']}");

        return response()->json([
            'token' => $user->createToken('auth', ['*'])->plainTextToken,
            'user' => $user->load('role'),
        ]);
    }

    public function me(Request $request)
    {
        return $request->user()->load('role');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}