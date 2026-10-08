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

    if (!table_has_column($db, 'services', 'influencer_id')) {
        $db->exec("ALTER TABLE services ADD COLUMN influencer_id CHAR(36) NULL AFTER catalog_service_id, ADD INDEX idx_services_influencer (influencer_id)");
    }

    if (!table_has_column($db, 'users', 'firebase_uid')) {
        $db->exec("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) NULL UNIQUE AFTER password_hash");
    }

    $profileImageColumn = fetch_one(
        $db,
        "SELECT CHARACTER_MAXIMUM_LENGTH AS max_length
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_image'
         LIMIT 1",
    );
    if ($profileImageColumn !== null && (int) $profileImageColumn['max_length'] < 2048) {
        $db->exec("ALTER TABLE users MODIFY profile_image VARCHAR(2048) NOT NULL DEFAULT ''");
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

    // Fixed roots are database records (not frontend constants). The management
    // API protects their identity while allowing their availability to change.
    $roots = [
        ['tax-service', 'Tax Service'], ['marketing', 'Marketing'],
        ['influencers', 'Influencers'], ['web-apps', 'Web & Apps'],
    ];
    foreach ($roots as $order => [$slug, $name]) {
        if (fetch_one($db, 'SELECT id FROM service_nodes WHERE slug = :slug LIMIT 1', [':slug' => $slug]) === null) {
            insert_row($db, 'service_nodes', ['id'=>uuid_v4(), 'parent_id'=>null, 'slug'=>$slug, 'name'=>$name, 'description'=>'', 'price'=>0, 'image'=>'', 'metadata'=>null, 'is_active'=>1, 'is_fixed_root'=>1, 'sort_order'=>$order + 1, 'created_at'=>$now, 'updated_at'=>$now]);
        }
    }

    $taxRoot = fetch_one($db, "SELECT id FROM service_nodes WHERE slug = 'tax-service' LIMIT 1");
    if ($taxRoot !== null && (int) fetch_value($db, 'SELECT COUNT(*) FROM service_nodes WHERE parent_id = :id', [':id'=>$taxRoot['id']]) === 0) {
        $taxServices = [
            'GST Services' => ['GST Registration','GST Return Filing','GST Notice Handling','LUT & Refunds','E-Way Bill & E-Invoicing','GST Audit & Health Check'],
            'Income Tax Services' => ['ITR Filing (All Forms)','Tax Planning & Consultancy','Income Tax Notices','TDS Return Filing','Capital Gains & Crypto','Business Tax Compliance'],
            'Accounting Services' => ['Bookkeeping','Payroll Management','Financial Reporting & MIS','TDS Compliance','Virtual CFO','Software Migration'],
            'Business Registration' => ['Company Registration','Food License'],
        ];
        $parentPosition = 0;
        foreach ($taxServices as $parentOrder => $children) {
            $parentPosition++; $parentId=uuid_v4(); insert_row($db,'service_nodes',['id'=>$parentId,'parent_id'=>$taxRoot['id'],'slug'=>cms_seed_slug($parentOrder),'name'=>$parentOrder,'description'=>'','price'=>0,'image'=>'','metadata'=>null,'is_active'=>1,'is_fixed_root'=>0,'sort_order'=>$parentPosition,'created_at'=>$now,'updated_at'=>$now]);
            foreach ($children as $childOrder => $childName) insert_row($db,'service_nodes',['id'=>uuid_v4(),'parent_id'=>$parentId,'slug'=>cms_seed_slug($parentOrder.'-'.$childName),'name'=>$childName,'description'=>'','price'=>0,'image'=>'','metadata'=>null,'is_active'=>1,'is_fixed_root'=>0,'sort_order'=>$childOrder+1,'created_at'=>$now,'updated_at'=>$now]);
        }
    }
    // Marketing and Web & Apps are direct, database-managed service lists. Add
    // missing defaults one by one so an administrator's existing edits remain intact.
    $ensureDirectServices = function (?array $root, array $services) use ($db, $now): void {
        if ($root === null) return;
        foreach ($services as $order => [$name, $description, $price, $icon, $features]) {
            $slug = cms_seed_slug($name);
            $existing = fetch_one($db, 'SELECT id, description, metadata FROM service_nodes WHERE parent_id = :parent_id AND slug = :slug LIMIT 1', [':parent_id'=>$root['id'], ':slug'=>$slug]);
            if ($existing !== null) {
                $updates = [];
                if (trim((string) $existing['description']) === '') $updates['description'] = $description;
                if (trim((string) ($existing['metadata'] ?? '')) === '') $updates['metadata'] = json_encode(['icon'=>$icon, 'features'=>$features]);
                if ($updates !== []) { $updates['updated_at'] = $now; update_row($db, 'service_nodes', $updates, 'id = :id', [':id'=>$existing['id']]); }
                continue;
            }
            insert_row($db, 'service_nodes', ['id'=>uuid_v4(), 'parent_id'=>$root['id'], 'slug'=>$slug, 'name'=>$name, 'description'=>$description, 'price'=>$price, 'image'=>'', 'metadata'=>json_encode(['icon'=>$icon, 'features'=>$features]), 'is_active'=>1, 'is_fixed_root'=>0, 'sort_order'=>$order + 1, 'created_at'=>$now, 'updated_at'=>$now]);
        }
    };
    $ensureDirectServices(fetch_one($db, "SELECT id FROM service_nodes WHERE slug = 'marketing' LIMIT 1"), [
        ['SEO Services', 'Technical SEO, local SEO and content clusters that improve visibility and generate qualified leads.', 0, 'searchCheck', []],
        ['Google Ads', 'Search, Shopping, Display and YouTube campaigns managed to a clear ROAS target.', 0, 'growthChart', []],
        ['Facebook & Instagram Ads', 'Full-funnel Meta campaigns with creative testing, audiences and retargeting.', 0, 'megaphone', []],
        ['Social Media Marketing', 'Strategy, creative execution and measurable social media growth across the channels that matter to your customers.', 0, 'megaphone', []],
        ['Instagram Marketing', 'Grid strategy, reels calendar and community growth for strong brand recall.', 0, 'users', []],
        ['Content & AI Video Creation', 'Scripts, professional reels, video editing and AI-generated content at scale.', 0, 'sparkle', []],
        ['Lead Generation', 'Landing pages, advertisements and conversion pipelines for predictable lead flow.', 0, 'layers', []],
    ]);
    $ensureDirectServices(fetch_one($db, "SELECT id FROM service_nodes WHERE slug = 'web-apps' LIMIT 1"), [
        ['Business Website', '3–5 page premium website with modern UI/UX, responsive design and basic SEO.', 14999, 'globe', ['Modern & Responsive Design', 'Up to 5 Pages', 'Basic SEO Setup', 'Contact Form', 'Delivery in 7 Days']],
        ['E-Commerce Website', 'Full online store with payments, shipping, coupons and complete order management.', 34999, 'cart', ['Payment Gateway Integration', 'Product & Inventory Management', 'Coupons / Offers', 'Order Management', 'Training & Handover']],
        ['Landing Page', 'High-converting campaign landing pages built for ad traffic and lead capture.', 7999, 'rocket', ['A/B Optimized', 'Lead Form / CTA Block', 'Fast Loading Performance', 'Fully Responsive', 'Delivery in 3 Days']],
        ['App Development', 'Android and iOS apps, CRM and custom solutions tailored to your workflow.', 79999, 'phone', ['Cross-platform Delivery', 'Admin Dashboard', 'Store Launch Support', 'AMC Available', 'Support & Maintenance']],
    ]);

    if (!table_has_column($db, 'influencers', 'engagement')) {
        $db->exec("ALTER TABLE influencers ADD COLUMN engagement VARCHAR(80) NOT NULL DEFAULT '' AFTER followers");
    }
    if (!table_has_column($db, 'influencers', 'location')) {
        $db->exec("ALTER TABLE influencers ADD COLUMN location VARCHAR(190) NOT NULL DEFAULT '' AFTER engagement");
    }
    if (!table_has_column($db, 'influencers', 'booking_price')) {
        $db->exec("ALTER TABLE influencers ADD COLUMN booking_price DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER location");
    }

    if (table_exists($db, 'public_services')) {
        execute_statement($db, "UPDATE public_services SET service_type = 'influencer' WHERE slug = 'influencer-marketing' AND service_type = 'marketing'");
    }

    if ((int) fetch_value($db, 'SELECT COUNT(*) FROM public_services') === 0) {
        $publicServices = [
            ['GST Services','gst-services','GST registration, returns and compliance support.','tax','fileCheck',2500],
            ['Income Tax Services','income-tax-services','Accurate filing, planning and notice support.','tax','calculator',1500],
            ['Accounting Services','accounting-services','Reliable bookkeeping and financial reporting.','tax','book',3500],
            ['Business Registration','business-registration','Start and structure your business with confidence.','tax','building',5000],
            ['Social Media Marketing','social-media-marketing','Strategy, creative execution and measurable growth.','marketing','megaphone',0],
            ['Influencer Marketing','influencer-marketing','Creator campaigns that connect with the right audience.','influencer','users',0],
            ['Business Website','business-website','Fast, responsive, conversion-focused business websites.','web-app','globe',14999],
            ['App Development','app-development','Cross-platform mobile applications and custom solutions.','web-app','phone',79999],
        ];
        foreach ($publicServices as $order => [$name,$slug,$description,$type,$icon,$price]) insert_row($db, 'public_services', [
            'id'=>uuid_v4(),'category_id'=>null,'name'=>$name,'slug'=>$slug,'short_description'=>$description,'full_description'=>$description,
            'price'=>$price,'image'=>'','icon'=>$icon,'service_type'=>$type,'is_featured'=>1,'is_active'=>1,'display_order'=>$order + 1,'created_at'=>$now,'updated_at'=>$now,
        ]);
    }

    if ((int) fetch_value($db, 'SELECT COUNT(*) FROM content_items WHERE content_type = "testimonial"') === 0) {
        foreach ([['Rhea Bansal','D2C Founder','They streamlined our GST and bookkeeping workflows in under a month.'],['Kunal Sethi','Consulting Professional','Clear answers to my tax filing questions without jargon.'],['Ananya Sharma','Early-stage Startup','Every milestone was organized from incorporation to audit.']] as $order => [$name,$company,$quote]) insert_row($db,'content_items',['id'=>uuid_v4(),'content_type'=>'testimonial','title'=>$name,'slug'=>cms_seed_slug($name),'summary'=>$company,'body'=>$quote,'image'=>'','metadata'=>null,'is_featured'=>1,'is_active'=>1,'display_order'=>$order+1,'created_at'=>$now,'updated_at'=>$now]);
    }

    if ((int) fetch_value($db, 'SELECT COUNT(*) FROM influencers') === 0) {
        $influencers = [
            ['Ananya Sharma','@ananya_style','Fashion & Lifestyle','Instagram','439K','8.3%','Mumbai',25000],
            ['Rohan Malhotra','@tech.rohan','Tech & Gadgets','YouTube','326K','3.2%','Bengaluru',45000],
            ['Priya Verma','@priya_verma','Finance & Wealth','Instagram','530K','7.4%','Delhi',30000],
            ['Arjun Mehta','@arjuntrip','Food & Travel','YouTube','628K','9.3%','Hyderabad',35000],
            ['Kedar Anand','@kedarontheroad','Travel','Instagram','2.2M','4.6%','Pune',50000],
            ['Sneha Kulkarni','@snehafit','Fitness & Health','Instagram','389K','5.2%','Mumbai',35000],
            ['Vikram Singh','@vikramtech','Tech & Gadgets','YouTube','891K','4.4%','Jaipur',22000],
            ['Ishita Rao','@ishita_beauty','Fashion & Lifestyle','Instagram','2.3M','6.3%','Delhi NCR',55000],
            ['Neha Joshi','@nehajoshi.style','Fashion & Lifestyle','Instagram','431K','3.4%','Ahmedabad',18000],
            ['Dev Patel','@dev_gaming','Gaming','YouTube','426K','7.7%','Surat',28000],
            ['Tara Shah','@tara_travel','Food & Travel','Instagram','738K','3.3%','Goa',40000],
            ['Kabir Khanna','@kabirfinance','Finance & Wealth','YouTube','612K','5.8%','Gurugram',42000],
        ];
        foreach ($influencers as $order => [$name,$username,$niche,$platform,$followers,$engagement,$location,$price]) insert_row($db, 'influencers', [
            'id'=>uuid_v4(),'name'=>$name,'username'=>$username,'platform'=>$platform,'followers'=>$followers,'engagement'=>$engagement,'location'=>$location,'booking_price'=>$price,'niche'=>$niche,'bio'=>'','profile_url'=>'','image'=>'','is_featured'=>$order < 4 ? 1 : 0,'is_active'=>1,'display_order'=>$order + 1,'created_at'=>$now,'updated_at'=>$now,
        ]);
    }
    if ((int) fetch_value($db, 'SELECT COUNT(*) FROM content_items WHERE content_type = "faq"') === 0) {
        foreach ([['What services do you provide?','Tax, compliance, accounting, marketing, web development and influencer marketing support.'],['How do I get started?','Use the consultation button or WhatsApp us with your requirement.']] as $order => [$question,$answer]) insert_row($db,'content_items',['id'=>uuid_v4(),'content_type'=>'faq','title'=>$question,'slug'=>cms_seed_slug($question),'summary'=>'','body'=>$answer,'image'=>'','metadata'=>null,'is_featured'=>0,'is_active'=>1,'display_order'=>$order+1,'created_at'=>$now,'updated_at'=>$now]);
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

function cms_seed_slug(string $value): string
{
    $value = strtolower(preg_replace('/[^a-z0-9]+/i', '-', trim($value)) ?? 'item');
    return trim($value, '-') ?: 'item-' . substr(uuid_v4(), 0, 8);
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
