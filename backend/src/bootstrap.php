<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
define('UPLOADS_ROOT', APP_ROOT . DIRECTORY_SEPARATOR . 'uploads');

require_once APP_ROOT . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'env.php';

// Headers (including CORS) are applied before app_context() creates the
// database connection, so load environment settings here as well.
load_env_file(APP_ROOT . DIRECTORY_SEPARATOR . '.env');

require_once __DIR__ . DIRECTORY_SEPARATOR . 'http.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'db.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'shared.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'auth.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'firebase_auth.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'cloudinary.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'storage.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'serializers.php';
require_once __DIR__ . DIRECTORY_SEPARATOR . 'domain.php';

function app_context(): array
{
    static $app = null;

    if ($app !== null) {
        return $app;
    }

    load_env_file(APP_ROOT . DIRECTORY_SEPARATOR . '.env');
    date_default_timezone_set(env_value('APP_TIMEZONE', 'Asia/Kolkata'));
    ensure_directory(UPLOADS_ROOT);

    $db = create_database_connection();
    ensure_schema($db);
    seed_defaults($db);

    $app = [
        'db' => $db,
    ];

    return $app;
}
