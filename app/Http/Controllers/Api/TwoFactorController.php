<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    // Generates a secret and a QR code to scan with the authenticator app
    public function setup(Request $request)
    {
        $user = $request->user();

        if ($user->totp_confirmed_at) {
            return response()->json(['message' => '2FA is already enabled.'], 409);
        }

        $google2fa = new Google2FA();
        $user->totp_secret = $google2fa->generateSecretKey();
        $user->save();

        $url = $google2fa->getQRCodeUrl('SNED Learning', $user->email, $user->totp_secret);

        $svg = (new Writer(new ImageRenderer(
            new RendererStyle(220),
            new SvgImageBackEnd()
        )))->writeString($url);

        return response()->json([
            'secret' => $user->totp_secret,
            'qr_svg' => $svg,
        ]);
    }

    // The first code confirms setup, then issues the real token
    public function confirm(Request $request)
    {
        $data = $request->validate(['code' => 'required|digits:6']);
        $user = $request->user();

        if (! $user->totp_secret ||
            ! (new Google2FA())->verifyKey($user->totp_secret, $data['code'])) {
            return response()->json(['message' => 'Invalid code.'], 422);
        }

        $recovery = collect(range(1, 8))->map(fn () => Str::lower(Str::random(10)))->all();

        $user->totp_confirmed_at = now();
        $user->recovery_codes = $recovery;
        $user->save();

        // The limited setup token is replaced by a full one
        $user->tokens()->delete();

        return response()->json([
            'token' => $user->createToken('auth', ['*'])->plainTextToken,
            'recovery_codes' => $recovery,
        ]);
    }
}