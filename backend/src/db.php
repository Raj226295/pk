<?php
declare(strict_types=1);

function create_database_connection(): PDO
{
    $host = env_value('DB_HOST', '127.0.0.1');
    $port = (int) env_value('DB_PORT', '3306');
    $databaseName = env_value('DB_NAME', 'pkbusiness');
    $user = env_value('DB_USER', 'root');
    $password = env_value('DB_PASSWORD', '');

    if (!preg_match('/^[A-Za-z0-9_]+$/', $databaseName)) {
        throw new AppError(500, 'DB_NAME is missing or invalid. Use letters, numbers, and underscores only.');
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $bootstrap = new PDO(
        sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $host, $port),
        $user,
        $password,
        $options,
    );

    $bootstrap->exec(sprintf(
        'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
        $databaseName,
    ));

    return new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $databaseName),
        $user,
        $password,
        $options,
    );
}

function ensure_schema(PDO $db): void
{
    $schema = file_get_contents(APP_ROOT . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'schema.sql');

    if ($schema === false) {
        throw new AppError(500, 'Unable to load database schema.');
    }

    $statements = preg_split('/;\s*(?:\r?\n|$)/', $schema) ?: [];

    foreach ($statements as $statement) {
        $trimmed = trim($statement);

        if ($trimmed === '') {
            continue;
        }

        $db->exec($trimmed);
    }

    ensure_schema_migrations($db);
}

function ensure_schema_migrations(PDO $db): void
{
    if (!table_exists($db, 'payment_events')) {
        $db->exec(
            "CREATE TABLE payment_events (
                id CHAR(36) PRIMARY KEY,
                payment_id CHAR(36) NULL,
                user_id CHAR(36) NULL,
                event_type VARCHAR(80) NOT NULL,
                source VARCHAR(30) NOT NULL DEFAULT 'system',
                message TEXT NOT NULL,
                payload LONGTEXT NULL,
                created_at DATETIME NOT NULL,
                INDEX idx_payment_events_payment (payment_id),
                INDEX idx_payment_events_user (user_id),
                INDEX idx_payment_events_type (event_type),
                CONSTRAINT fk_payment_events_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
                CONSTRAINT fk_payment_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )"
        );
    }

    if (!table_has_column($db, 'payments', 'screenshot_type')) {
        $db->exec("ALTER TABLE payments ADD COLUMN screenshot_type VARCHAR(190) NOT NULL DEFAULT 'application/octet-stream' AFTER screenshot_name");
    }

    if (!table_has_column($db, 'documents', 'input_type')) {
        $db->exec("ALTER TABLE documents ADD COLUMN input_type VARCHAR(20) NOT NULL DEFAULT 'file' AFTER service_type");
    }

    if (!table_has_column($db, 'documents', 'text_value')) {
        $db->exec("ALTER TABLE documents ADD COLUMN text_value TEXT NULL AFTER input_type");
    }

    if (!table_has_column($db, 'contact_messages', 'source')) {
        $db->exec("ALTER TABLE contact_messages ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'contact' AFTER message");
    }

    if (!table_has_column($db, 'contact_messages', 'page_url')) {
        $db->exec("ALTER TABLE contact_messages ADD COLUMN page_url VARCHAR(255) NOT NULL DEFAULT '' AFTER source");
    }
}

function table_exists(PDO $db, string $table): bool
{
    return fetch_one(
        $db,
        'SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :tableName
         LIMIT 1',
        [
            ':tableName' => $table,
        ],
    ) !== null;
}

function table_has_column(PDO $db, string $table, string $column): bool
{
    return fetch_one(
        $db,
        'SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :tableName
           AND COLUMN_NAME = :columnName
         LIMIT 1',
        [
            ':tableName' => $table,
            ':columnName' => $column,
        ],
    ) !== null;
}

function seed_defaults(PDO $db): void
{
    $now = now_db();

    if ((int) fetch_value($db, 'SELECT COUNT(*) FROM blogs') === 0) {
        $blogs = [
            [
                'title' => '5 Documents Every Salaried Person Should Keep Ready for ITR Filing',
                'slug' => 'documents-for-salaried-itr-filing',
                'description' => 'A practical checklist to make income tax filing faster and cleaner each year.',
                'category' => 'Income Tax',
                'content' => "Income tax filing gets easier when your documentation is organised before the deadline.\n\nKeep Form 16, annual bank interest certificates, capital gains statements, and proof of deductions in one place.\n\nIf you changed employers, review both Form 16 sets carefully so salary and TDS figures do not get duplicated.\n\nA quick reconciliation before filing reduces the chance of notices, delayed refunds, and avoidable revisions.",
            ],
            [
                'title' => 'Monthly GST Hygiene for Small Businesses',
                'slug' => 'monthly-gst-hygiene-small-businesses',
                'description' => 'A simple operating rhythm that reduces filing stress and mismatches.',
                'category' => 'GST',
                'content' => "GST compliance becomes manageable when the data is reviewed throughout the month instead of only on the filing date.\n\nReconcile sales invoices, purchase invoices, e-way bills, and vendor filings every week.\n\nFlag high-value mismatches early so that the accounting team and vendors can correct them before the return cycle closes.\n\nThis routine improves input credit accuracy and keeps notices to a minimum.",
            ],
            [
                'title' => 'When Should a Startup Prepare for Its First Audit?',
                'slug' => 'startup-first-audit-readiness',
                'description' => 'Early audit preparation helps founders avoid year-end surprises and document gaps.',
                'category' => 'Audit',
                'content' => "Many startups wait too long to prepare for their first audit and then scramble for contracts, ledgers, and approvals.\n\nAudit readiness should begin with clean bookkeeping, documented founder expenses, payroll records, and board resolutions where required.\n\nKeeping statutory registers and vendor agreements updated through the year reduces the cost and stress of the final audit cycle.\n\nA readiness review midway through the year can surface gaps before they become deadlines.",
            ],
        ];

        foreach ($blogs as $blog) {
            insert_row($db, 'blogs', [
                'id' => uuid_v4(),
                'title' => $blog['title'],
                'slug' => $blog['slug'],
                'description' => $blog['description'],
                'content' => $blog['content'],
                'category' => $blog['category'],
                'published_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    if ((int) fetch_value($db, 'SELECT COUNT(*) FROM service_catalog') === 0) {
        $services = [
            ['Income Tax Filing', 'ITR preparation, review, filing support, and follow-up guidance.', 1500, 1],
            ['GST Registration & Return', 'GST registration, return filing, and recurring compliance support.', 2500, 2],
            ['Audit Services', 'Audit planning, compliance review, and reporting assistance.', 6000, 3],
            ['Accounting / Bookkeeping', 'Routine bookkeeping, ledger management, and monthly financial tracking.', 3500, 4],
            ['Company Registration', 'Entity setup support with filing and documentation assistance.', 5000, 5],
            ['Food License', 'Application filing and compliance guidance for food business licenses.', 3000, 6],
        ];

        foreach ($services as [$name, $description, $price, $sortOrder]) {
            insert_row($db, 'service_catalog', [
                'id' => uuid_v4(),
                'name' => $name,
                'description' => $description,
                'price' => $price,
                'is_active' => 1,
                'image' => '',
                'image_zoom' => 1,
                'image_offset_x' => 0,
                'image_offset_y' => 0,
                'sort_order' => $sortOrder,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    $adminEmail = strtolower((string) env_value('ADMIN_EMAIL', 'admin@pkbusiness.local'));
    $adminPassword = env_value('ADMIN_PASSWORD', 'ChangeMe123!');

    $admin = fetch_one($db, "SELECT * FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1");

    if ($admin === null) {
        insert_row($db, 'users', [
            'id' => uuid_v4(),
            'name' => env_value('ADMIN_NAME', 'PK Business Admin'),
            'email' => $adminEmail,
            'phone' => env_value('ADMIN_PHONE', '9999999999'),
            'company_name' => '',
            'profile_image' => '',
            'profile_image_zoom' => 1,
            'profile_image_offset_x' => 0,
            'profile_image_offset_y' => 0,
            'is_blocked' => 0,
            'blocked_at' => null,
            'password_hash' => password_hash((string) $adminPassword, PASSWORD_DEFAULT),
            'role' => 'admin',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    } else {
        $adminUpdates = [];

        if (strtolower((string) $admin['email']) !== $adminEmail) {
            $adminUpdates['email'] = $adminEmail;
        }

        if (!password_verify((string) $adminPassword, (string) $admin['password_hash'])) {
            $adminUpdates['password_hash'] = password_hash((string) $adminPassword, PASSWORD_DEFAULT);
        }

        if ($adminUpdates !== []) {
            $adminUpdates['updated_at'] = $now;
            update_row($db, 'users', $adminUpdates, 'id = :id', [':id' => $admin['id']]);
        }
    }
}

function fetch_one(PDO $db, string $sql, array $params = []): ?array
{
    $statement = $db->prepare($sql);
    $statement->execute($params);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function fetch_all(PDO $db, string $sql, array $params = []): array
{
    $statement = $db->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll();
}

function fetch_value(PDO $db, string $sql, array $params = []): mixed
{
    $statement = $db->prepare($sql);
    $statement->execute($params);
    return $statement->fetchColumn();
}

function execute_statement(PDO $db, string $sql, array $params = []): int
{
    $statement = $db->prepare($sql);
    $statement->execute($params);
    return $statement->rowCount();
}

function insert_row(PDO $db, string $table, array $payload): void
{
    $columns = array_keys($payload);
    $quotedColumns = implode(', ', array_map(static fn ($column) => '`' . $column . '`', $columns));
    $placeholders = implode(', ', array_map(static fn ($column) => ':' . $column, $columns));
    $sql = sprintf('INSERT INTO `%s` (%s) VALUES (%s)', $table, $quotedColumns, $placeholders);
    $statement = $db->prepare($sql);

    foreach ($payload as $key => $value) {
        $statement->bindValue(':' . $key, $value);
    }

    $statement->execute();
}

function update_row(PDO $db, string $table, array $payload, string $whereClause, array $params = []): void
{
    $assignments = [];

    foreach (array_keys($payload) as $column) {
        $assignments[] = sprintf('`%s` = :set_%s', $column, $column);
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE %s', $table, implode(', ', $assignments), $whereClause);
    $statement = $db->prepare($sql);

    foreach ($payload as $key => $value) {
        $statement->bindValue(':set_' . $key, $value);
    }

    foreach ($params as $key => $value) {
        $statement->bindValue(is_string($key) ? $key : ':' . $key, $value);
    }

    $statement->execute();
}

function uuid_v4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);

    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12),
    );
}

function now_db(): string
{
    return (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
}
