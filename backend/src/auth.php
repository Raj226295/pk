<?php
declare(strict_types=1);

function base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode(string $value): string
{
    $padding = strlen($value) % 4;

    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }

    return (string) base64_decode(strtr($value, '-_', '+/'));
}

function issue_token(string $userId): string
{
    $secret = env_value('JWT_SECRET', 'change-this-secret');
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode([
        'id' => $userId,
        'iat' => time(),
        'exp' => time() + (int) env_value('JWT_EXPIRES_IN_SECONDS', (string) (60 * 60 * 24 * 30)),
    ]));
    $signature = base64url_encode(hash_hmac('sha256', $header . '.' . $payload, (string) $secret, true));
    return $header . '.' . $payload . '.' . $signature;
}

function decode_token(string $token): array
{
    $parts = explode('.', $token);

    if (count($parts) !== 3) {
        throw new AppError(401, 'Not authorized, token missing');
    }

    [$header, $payload, $signature] = $parts;
    $expected = base64url_encode(hash_hmac(
        'sha256',
        $header . '.' . $payload,
        (string) env_value('JWT_SECRET', 'change-this-secret'),
        true,
    ));

    if (!hash_equals($expected, $signature)) {
        throw new AppError(401, 'Not authorized, token invalid');
    }

    $decoded = json_decode(base64url_decode($payload), true);

    if (!is_array($decoded) || empty($decoded['id'])) {
        throw new AppError(401, 'Not authorized, token invalid');
    }

    if (!empty($decoded['exp']) && (int) $decoded['exp'] < time()) {
        throw new AppError(401, 'Not authorized, token expired');
    }

    return $decoded;
}

function bearer_token(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!is_string($header) || !str_starts_with($header, 'Bearer ')) {
        throw new AppError(401, 'Not authorized, token missing');
    }

    return trim(substr($header, 7));
}

function current_user(PDO $db): array
{
    $decoded = decode_token(bearer_token());
    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $decoded['id']]);

    if ($user === null) {
        throw new AppError(401, 'User not found');
    }

    if ((int) $user['is_blocked'] === 1) {
        throw new AppError(403, 'This account has been blocked. Please contact the admin.');
    }

    return $user;
}

function require_admin(PDO $db): array
{
    $user = current_user($db);

    if (($user['role'] ?? 'user') !== 'admin') {
        throw new AppError(403, 'Admin access required');
    }

    return $user;
}
