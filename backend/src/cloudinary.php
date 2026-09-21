<?php
declare(strict_types=1);

use Cloudinary\Cloudinary;

function cloudinary_is_configured(): bool
{
    return env_value('CLOUDINARY_CLOUD_NAME') !== null
        && env_value('CLOUDINARY_API_KEY') !== null
        && env_value('CLOUDINARY_API_SECRET') !== null;
}

function cloudinary_transport_is_available(): bool
{
    return function_exists('curl_init')
        || extension_loaded('openssl')
        || in_array('https', stream_get_wrappers(), true);
}

function cloudinary_folder_root(): string
{
    return trim((string) env_value('CLOUDINARY_FOLDER_ROOT', 'ca-project'), '/');
}

function cloudinary_configuration(): array
{
    $cloudName = env_value('CLOUDINARY_CLOUD_NAME');
    $apiKey = env_value('CLOUDINARY_API_KEY');
    $apiSecret = env_value('CLOUDINARY_API_SECRET');

    if ($cloudName === null || $apiKey === null || $apiSecret === null) {
        throw new AppError(
            500,
            'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to backend/.env.',
        );
    }

    if (!cloudinary_transport_is_available()) {
        throw new AppError(
            500,
            'Cloudinary uploads require PHP cURL or OpenSSL/HTTPS stream support. Enable one of those extensions or set UPLOAD_STORAGE=local for development.',
        );
    }

    return [
        'cloud' => [
            'cloud_name' => $cloudName,
            'api_key' => $apiKey,
            'api_secret' => $apiSecret,
        ],
        'url' => [
            'secure' => true,
        ],
        'api' => [
            'connection_timeout' => 10,
            'timeout' => 35,
            'upload_timeout' => 35,
        ],
    ];
}

function cloudinary_client(): Cloudinary
{
    static $client = null;

    if ($client instanceof Cloudinary) {
        return $client;
    }

    $client = new Cloudinary(cloudinary_configuration());
    return $client;
}
