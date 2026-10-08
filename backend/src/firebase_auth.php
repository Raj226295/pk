<?php
declare(strict_types=1);

use Kreait\Firebase\Contract\Auth as FirebaseAuthContract;
use Kreait\Firebase\Factory;

function firebase_auth_service(): FirebaseAuthContract
{
    static $auth = null;

    if ($auth instanceof FirebaseAuthContract) {
        return $auth;
    }

    $credentialPath = trim(env_value('FIREBASE_SERVICE_ACCOUNT_PATH', ''));
    $projectId = trim(env_value('FIREBASE_PROJECT_ID', ''));

    if ($credentialPath !== '' && !is_absolute_path($credentialPath)) {
        $credentialPath = APP_ROOT . DIRECTORY_SEPARATOR . str_replace(
            ['/', '\\'],
            DIRECTORY_SEPARATOR,
            $credentialPath
        );
    }

    if ($projectId === '' || $credentialPath === '' || !is_file($credentialPath) || !is_readable($credentialPath)) {
        throw new AppError(500, 'Google sign-in is not configured on the server');
    }

    $serviceAccountJson = file_get_contents($credentialPath);
    $serviceAccount = is_string($serviceAccountJson)
        ? json_decode($serviceAccountJson, true)
        : null;

    if (!is_array($serviceAccount) || ($serviceAccount['project_id'] ?? '') !== $projectId) {
        error_log('Firebase service-account project does not match FIREBASE_PROJECT_ID.');
        throw new AppError(500, 'Google sign-in is not configured correctly on the server');
    }

    try {
        $auth = (new Factory())
            ->withServiceAccount($credentialPath)
            ->withProjectId($projectId)
            ->createAuth();
    } catch (Throwable $error) {
        error_log('Firebase Auth initialization failed: ' . $error->getMessage());
        throw new AppError(500, 'Google sign-in is temporarily unavailable');
    }

    return $auth;
}

function is_absolute_path(string $path): bool
{
    return str_starts_with($path, '/')
        || str_starts_with($path, '\\\\')
        || preg_match('/^[A-Za-z]:[\\\\\/]/', $path) === 1;
}

function verify_firebase_google_id_token(string $idToken): array
{
    try {
        // Signature, issuer, audience, expiry, and project checks are all
        // performed here. Revocation lookup is deliberately omitted: it is an
        // optional extra Firebase Admin API permission and can reject valid
        // Google sign-ins when a service account has not been granted it.
        // Google and local machine clocks can differ by a few seconds. Permit
        // a small 2-minute drift while retaining all signature, issuer,
        // audience, expiry, and project validation.
        $verifiedToken = firebase_auth_service()->verifyIdToken($idToken, false, 120);
        $claims = $verifiedToken->claims();
        $uid = trim((string) $claims->get('sub', ''));
        $email = strtolower(trim((string) $claims->get('email', '')));
        $name = trim((string) $claims->get('name', ''));
        $emailVerified = $claims->get('email_verified', false) === true;

        if ($uid === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !$emailVerified) {
            throw new AppError(401, 'Your Google account must have a verified email address');
        }

        return [
            'uid' => $uid,
            'email' => $email,
            'name' => $name,
        ];
    } catch (AppError $error) {
        throw $error;
    } catch (Throwable $error) {
        $message = 'Firebase ID token verification failed: ' . $error->getMessage();
        error_log($message);
        error_log($message . PHP_EOL, 3, APP_ROOT . DIRECTORY_SEPARATOR . 'firebase-auth-errors.log');

        if (env_value('APP_DEBUG', 'false') === 'true') {
            throw new AppError(401, 'Google verification detail: ' . $error->getMessage());
        }

        throw new AppError(401, 'Google sign-in could not be verified. Please try again.');
    }
}
