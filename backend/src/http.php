<?php
declare(strict_types=1);

final class AppError extends RuntimeException
{
    public int $status;

    public function __construct(int $status, string $message, ?Throwable $previous = null)
    {
        parent::__construct($message, $status, $previous);
        $this->status = $status;
    }
}

function apply_common_headers(): void
{
    header('Access-Control-Allow-Origin: ' . env_value('APP_CORS_ORIGIN', '*'));
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

function request_method(): string
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method === 'POST' && isset($_GET['_method'])) {
        $override = strtoupper(trim((string) $_GET['_method']));

        if (in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) {
            return $override;
        }
    }

    return $method;
}

function request_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    return rtrim($path === '' ? '/' : $path, '/') ?: '/';
}

function route_match(string $path, string $pattern): ?array
{
    if (!preg_match('#^' . $pattern . '$#', $path, $matches)) {
        return null;
    }

    $params = [];

    foreach ($matches as $key => $value) {
        if (is_string($key)) {
            $params[$key] = $value;
        }
    }

    return $params;
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
}

function request_data(): array
{
    static $payload = null;

    if ($payload !== null) {
        return $payload;
    }

    if (!empty($_POST)) {
        $payload = $_POST;
        return $payload;
    }

    $raw = file_get_contents('php://input');
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));

    if ($raw === false || $raw === '') {
        $payload = [];
        return $payload;
    }

    if (str_contains($contentType, 'application/json')) {
        $decoded = json_decode($raw, true);
        $payload = is_array($decoded) ? $decoded : [];
        return $payload;
    }

    parse_str($raw, $decoded);
    $payload = is_array($decoded) ? $decoded : [];
    return $payload;
}

function request_file(string $field): ?array
{
    if (!isset($_FILES[$field])) {
        return null;
    }

    $file = $_FILES[$field];

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    return $file;
}
