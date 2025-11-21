<?php

namespace App\Helpers;

class AgoraTokenBuilder
{
    const ROLE_PUBLISHER = 1;
    const ROLE_SUBSCRIBER = 2;

    /**
     * Build Agora RTC Token with UID
     */
    public static function buildTokenWithUid(
        string $appId,
        string $appCertificate,
        string $channelName,
        int $uid,
        int $role,
        int $privilegeExpireTs
    ): string {
        $token = self::generateRtcToken(
            $appId,
            $appCertificate,
            $channelName,
            $uid,
            $role,
            $privilegeExpireTs
        );

        return $token;
    }

    /**
     * Generate RTC Token
     */
    private static function generateRtcToken(
        string $appId,
        string $appCertificate,
        string $channelName,
        int $uid,
        int $role,
        int $privilegeExpireTs
    ): string {
        $version = '007';
        $randomInt = random_int(0, 0xFFFFFFFF);
        $currentTimestamp = time();
        $expireTimestamp = $currentTimestamp + $privilegeExpireTs;

        // Build message to sign
        $message = pack('V', $randomInt);
        $message .= pack('V', $currentTimestamp);
        $message .= pack('V', $expireTimestamp);

        // Add channel name
        $message .= pack('v', strlen($channelName));
        $message .= $channelName;

        // Add UID
        $message .= pack('V', $uid);

        // Create signature
        $signature = hash_hmac('sha256', $message, $appCertificate, true);

        // Build token
        $token = $version . $appId;
        $token .= base64_encode($message . $signature);

        return $token;
    }
}
