<?php
declare(strict_types=1);

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$publicFile = __DIR__ . DIRECTORY_SEPARATOR . 'public' . str_replace('/', DIRECTORY_SEPARATOR, $uriPath);

if ($uriPath !== '/' && is_file($publicFile)) {
    return false;
}

if (str_starts_with($uriPath, '/uploads/')) {
    $relative = substr($uriPath, 9);
    $absolute = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);

    if (is_file($absolute)) {
        $mime = mime_content_type($absolute) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string) filesize($absolute));
        readfile($absolute);
        return true;
    }
}

require __DIR__ . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'index.php';
