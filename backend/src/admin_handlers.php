<?php
declare(strict_types=1);

function build_recent_activity_item_sort(array $left, array $right): int
{
    return strcmp((string) ($right['createdAt'] ?? ''), (string) ($left['createdAt'] ?? ''));
}

function handle_admin_overview(PDO $db): void
{
    require_admin($db);
    $totalUsers = (int) fetch_value($db, "SELECT COUNT(*) FROM users WHERE role = 'user'");
    $totalDocuments = (int) fetch_value($db, 'SELECT COUNT(*) FROM documents');
    $activeServices = (int) fetch_value($db, "SELECT COUNT(*) FROM services WHERE status NOT IN ('rejected', 'completed')");
    $completedServices = (int) fetch_value($db, "SELECT COUNT(*) FROM services WHERE status = 'completed'");
    $pendingDocuments = (int) fetch_value($db, "SELECT COUNT(*) FROM documents WHERE status = 'pending'");
    $pendingPayments = (int) fetch_value($db, "SELECT COUNT(*) FROM payments WHERE status = 'pending' OR verification_status = 'pending'");
    $pendingAppointments = (int) fetch_value($db, "SELECT COUNT(*) FROM appointments WHERE status IN ('pending', 'approved', 'rescheduled')");
    $totalAppointments = (int) fetch_value($db, 'SELECT COUNT(*) FROM appointments');
    $appointmentsToday = (int) fetch_value($db, 'SELECT COUNT(*) FROM appointments WHERE DATE(scheduled_for) = CURRENT_DATE()');
    $totalRevenue = (float) (fetch_value($db, "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid'") ?: 0);

    $monthlyIncome = [];
    $userGrowth = [];
    $cursor = new DateTimeImmutable('first day of -5 months');
    $runningUsers = 0;

    for ($index = 0; $index < 6; $index++) {
        $monthStart = $cursor->modify('+' . $index . ' month');
        $monthEnd = $monthStart->modify('+1 month');
        $label = $monthStart->format('M Y');
        $monthIncome = (float) (fetch_value(
            $db,
            "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND paid_at >= :start AND paid_at < :end",
            [':start' => $monthStart->format('Y-m-d H:i:s'), ':end' => $monthEnd->format('Y-m-d H:i:s')],
        ) ?: 0);
        $newUsers = (int) (fetch_value(
            $db,
            "SELECT COUNT(*) FROM users WHERE role = 'user' AND created_at >= :start AND created_at < :end",
            [':start' => $monthStart->format('Y-m-d H:i:s'), ':end' => $monthEnd->format('Y-m-d H:i:s')],
        ) ?: 0);
        $runningUsers += $newUsers;
        $monthlyIncome[] = ['label' => $label, 'amount' => $monthIncome];
        $userGrowth[] = ['label' => $label, 'newUsers' => $newUsers, 'totalUsers' => $runningUsers];
    }

    $recentDocuments = fetch_all(
        $db,
        sprintf(
            'SELECT d.*, %s FROM documents d LEFT JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 4',
            user_join_sql('u', 'user__'),
        ),
    );
    $recentPayments = fetch_all(
        $db,
        sprintf(
            'SELECT p.*, %s FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 4',
            user_join_sql('u', 'user__'),
        ),
    );
    $recentAppointments = fetch_all(
        $db,
        sprintf(
            'SELECT a.*, %s FROM appointments a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 4',
            user_join_sql('u', 'user__'),
        ),
    );
    $recentServices = fetch_all(
        $db,
        sprintf(
            'SELECT s.*, %s FROM services s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.updated_at DESC LIMIT 4',
            user_join_sql('u', 'user__'),
        ),
    );

    $recentActivity = [];

    foreach ($recentDocuments as $document) {
        $user = extract_prefixed_row($document, 'user__');
        $recentActivity[] = [
            'id' => 'document-' . $document['id'],
            'kind' => 'Document',
            'title' => $document['title'],
            'subtitle' => (($user['name'] ?? 'Unknown client') . (($document['input_type'] ?? 'file') === 'text'
                ? ' submitted ' . ($document['title'] ?: 'text details')
                : ' uploaded ' . (($document['original_name'] ?? '') !== '' ? $document['original_name'] : $document['filename']))),
            'status' => normalize_document_status_for_admin($document['status'] ?? 'pending'),
            'createdAt' => to_iso8601($document['created_at'] ?? null),
            'link' => '/admin/folders',
        ];
    }

    foreach ($recentPayments as $payment) {
        $user = extract_prefixed_row($payment, 'user__');
        $recentActivity[] = [
            'id' => 'payment-' . $payment['id'],
            'kind' => 'Payment',
            'title' => $payment['invoice_number'],
            'subtitle' => ($user['name'] ?? 'Unknown client') . ' | ' . $payment['service_type'],
            'status' => (($payment['verification_status'] ?? '') === 'verified') ? 'paid' : ($payment['verification_status'] ?? $payment['status']),
            'createdAt' => to_iso8601($payment['created_at'] ?? null),
            'link' => '/admin/payments',
        ];
    }

    foreach ($recentAppointments as $appointment) {
        $user = extract_prefixed_row($appointment, 'user__');
        $recentActivity[] = [
            'id' => 'appointment-' . $appointment['id'],
            'kind' => 'Appointment',
            'title' => $user['name'] ?? 'Unknown client',
            'subtitle' => 'Meeting request for ' . format_datetime_label($appointment['scheduled_for'] ?? null),
            'status' => normalize_appointment_status($appointment['status'] ?? 'pending'),
            'createdAt' => to_iso8601($appointment['created_at'] ?? null),
            'link' => '/admin/appointments',
        ];
    }

    foreach ($recentServices as $service) {
        $user = extract_prefixed_row($service, 'user__');
        $recentActivity[] = [
            'id' => 'service-' . $service['id'],
            'kind' => 'Service',
            'title' => $service['type'],
            'subtitle' => ($user['name'] ?? 'Unknown client') . ' | ' . ($service['status'] ?? 'pending'),
            'status' => $service['status'] ?? 'pending',
            'createdAt' => to_iso8601($service['updated_at'] ?? null),
            'link' => '/admin/services',
        ];
    }

    usort($recentActivity, 'build_recent_activity_item_sort');
    $recentActivity = array_slice($recentActivity, 0, 8);

    json_response([
        'overview' => [
            'totalUsers' => $totalUsers,
            'newNotifications' => $pendingDocuments + $pendingPayments + $pendingAppointments,
            'totalDocuments' => $totalDocuments,
            'activeServices' => $activeServices,
            'completedServices' => $completedServices,
            'pendingDocuments' => $pendingDocuments,
            'pendingPayments' => $pendingPayments,
            'pendingAppointments' => $pendingAppointments,
            'totalAppointments' => $totalAppointments,
            'pendingRequests' => $pendingDocuments + $pendingPayments + $pendingAppointments,
            'appointmentsToday' => $appointmentsToday,
            'totalRevenue' => $totalRevenue,
            'monthlyIncome' => $monthlyIncome,
            'userGrowth' => $userGrowth,
            'recentActivity' => $recentActivity,
        ],
    ]);
}

function ensure_message_thread(array &$threadMap, array $user): void
{
    $key = (string) $user['_id'];

    if (!isset($threadMap[$key])) {
        $threadMap[$key] = [
            'user' => $user,
            'items' => [],
            'unreadCount' => 0,
            'latestAt' => $user['createdAt'] ?? null,
            'latestSnippet' => '',
            'latestKind' => '',
        ];
    }
}

function push_message_thread_item(array &$threadMap, array $user, array $item): void
{
    $key = (string) $user['_id'];
    ensure_message_thread($threadMap, $user);
    $threadMap[$key]['items'][] = $item;

    if (!empty($item['needsAction'])) {
        $threadMap[$key]['unreadCount'] += 1;
    }
}

function handle_admin_messages(PDO $db): void
{
    require_admin($db);
    $users = fetch_all($db, "SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC");
    $documents = fetch_all(
        $db,
        sprintf(
            "SELECT d.*, %s FROM documents d LEFT JOIN users u ON u.id = d.user_id WHERE d.notes <> '' OR d.status = 'pending' ORDER BY d.created_at DESC",
            user_join_sql('u', 'user__'),
        ),
    );
    $appointments = fetch_all(
        $db,
        sprintf(
            "SELECT a.*, %s FROM appointments a LEFT JOIN users u ON u.id = a.user_id WHERE a.notes <> '' OR a.status IN ('pending', 'rescheduled') ORDER BY a.created_at DESC",
            user_join_sql('u', 'user__'),
        ),
    );
    $payments = fetch_all(
        $db,
        sprintf(
            "SELECT p.*, %s FROM payments p LEFT JOIN users u ON u.id = p.user_id WHERE p.description <> '' OR p.verification_status = 'pending' OR p.status = 'pending' ORDER BY p.created_at DESC",
            user_join_sql('u', 'user__'),
        ),
    );
    $services = fetch_all(
        $db,
        sprintf(
            "SELECT s.*, %s FROM services s LEFT JOIN users u ON u.id = s.user_id WHERE s.requested_by_client = 1 OR s.notes <> '' ORDER BY s.updated_at DESC",
            user_join_sql('u', 'user__'),
        ),
    );
    $notifications = fetch_all(
        $db,
        sprintf(
            "SELECT n.*, %s FROM notifications n LEFT JOIN users u ON u.id = n.user_id WHERE n.category = 'response' ORDER BY n.created_at DESC",
            user_join_sql('u', 'user__'),
        ),
    );

    $threadMap = [];

    foreach ($users as $user) {
        ensure_message_thread($threadMap, serialize_user_record($user));
    }

    foreach ($documents as $document) {
        $user = extract_prefixed_row($document, 'user__');

        if ($user === null) {
            continue;
        }

        $fileName = ($document['original_name'] ?? '') !== '' ? $document['original_name'] : $document['filename'];
        $submittedLabel = ($document['input_type'] ?? 'file') === 'text'
            ? ($document['title'] ?: 'text details')
            : $fileName;
        push_message_thread_item($threadMap, serialize_user_record($user), [
            'id' => 'document-' . $document['id'],
            'kind' => 'document',
            'direction' => 'inbound',
            'title' => $document['title'] ?: $submittedLabel,
            'message' => safe_trim($document['notes'] ?? '') !== '' ? $document['notes'] : (($document['input_type'] ?? 'file') === 'text'
                ? 'Submitted ' . $submittedLabel . ' for ' . $document['service_type'] . '.'
                : 'Uploaded ' . $fileName . ' for ' . $document['service_type'] . '.'),
            'createdAt' => to_iso8601($document['created_at'] ?? null),
            'status' => normalize_document_status_for_admin($document['status'] ?? 'pending'),
            'needsAction' => ($document['status'] ?? 'pending') === 'pending',
            'meta' => ['serviceType' => $document['service_type'], 'fileName' => $fileName, 'inputType' => $document['input_type'] ?? 'file'],
        ]);
    }

    foreach ($appointments as $appointment) {
        $user = extract_prefixed_row($appointment, 'user__');

        if ($user === null) {
            continue;
        }

        $status = normalize_appointment_status($appointment['status'] ?? 'pending');
        push_message_thread_item($threadMap, serialize_user_record($user), [
            'id' => 'appointment-' . $appointment['id'],
            'kind' => 'appointment',
            'direction' => 'inbound',
            'title' => 'Appointment request',
            'message' => safe_trim($appointment['notes'] ?? '') !== '' ? $appointment['notes'] : 'Requested consultation for ' . format_datetime_label($appointment['scheduled_for'] ?? null) . '.',
            'createdAt' => to_iso8601($appointment['created_at'] ?? null),
            'status' => $status,
            'needsAction' => in_array($status, ['pending', 'rescheduled'], true),
            'meta' => ['scheduledFor' => to_iso8601($appointment['scheduled_for'] ?? null)],
        ]);
    }

    foreach ($payments as $payment) {
        $user = extract_prefixed_row($payment, 'user__');

        if ($user === null) {
            continue;
        }

        $status = ($payment['verification_status'] ?? '') !== '' ? $payment['verification_status'] : ($payment['status'] ?? 'pending');
        push_message_thread_item($threadMap, serialize_user_record($user), [
            'id' => 'payment-' . $payment['id'],
            'kind' => 'payment',
            'direction' => 'inbound',
            'title' => $payment['invoice_number'],
            'message' => safe_trim($payment['description'] ?? '') !== '' ? $payment['description'] : 'Uploaded payment proof for ' . $payment['service_type'] . '.',
            'createdAt' => to_iso8601($payment['created_at'] ?? null),
            'status' => $status,
            'needsAction' => ($payment['verification_status'] ?? 'pending') === 'pending' || ($payment['status'] ?? 'pending') === 'pending',
            'meta' => ['amount' => (float) $payment['amount'], 'serviceType' => $payment['service_type'], 'screenshotUrl' => $payment['screenshot_url'] ?? ''],
        ]);
    }

    foreach ($services as $service) {
        $user = extract_prefixed_row($service, 'user__');

        if ($user === null) {
            continue;
        }

        $note = safe_trim($service['notes'] ?? '');
        push_message_thread_item($threadMap, serialize_user_record($user), [
            'id' => 'service-' . $service['id'],
            'kind' => 'service',
            'direction' => 'inbound',
            'title' => $service['type'],
            'message' => $note !== '' ? $note : ($service['type'] . ' needs a service-side review from the admin team.'),
            'createdAt' => to_iso8601($service['updated_at'] ?? $service['created_at'] ?? null),
            'status' => $service['status'] ?? 'pending',
            'needsAction' => (int) ($service['requested_by_client'] ?? 0) === 1 || (($service['status'] ?? 'pending') === 'pending' && $note !== ''),
            'meta' => ['priority' => $service['priority'] ?? 'medium'],
        ]);
    }

    foreach ($notifications as $notification) {
        $user = extract_prefixed_row($notification, 'user__');

        if ($user === null) {
            continue;
        }

        push_message_thread_item($threadMap, serialize_user_record($user), [
            'id' => 'notification-' . $notification['id'],
            'kind' => $notification['category'] ?? 'response',
            'direction' => 'outbound',
            'title' => $notification['title'],
            'message' => $notification['message'],
            'createdAt' => to_iso8601($notification['created_at'] ?? null),
            'status' => (int) ($notification['is_read'] ?? 0) === 1 ? 'read' : 'sent',
            'needsAction' => false,
            'meta' => ['actionLabel' => $notification['action_label'] ?? '', 'link' => $notification['link'] ?? ''],
        ]);
    }

    $threads = array_values($threadMap);

    foreach ($threads as &$thread) {
        usort($thread['items'], 'build_recent_activity_item_sort');
        $thread['latestAt'] = $thread['items'][0]['createdAt'] ?? $thread['latestAt'];
        $thread['latestSnippet'] = $thread['items'][0]['message'] ?? '';
        $thread['latestKind'] = $thread['items'][0]['kind'] ?? '';
    }
    unset($thread);

    usort($threads, static function (array $left, array $right): int {
        if (($right['unreadCount'] ?? 0) !== ($left['unreadCount'] ?? 0)) {
            return ($right['unreadCount'] <=> $left['unreadCount']);
        }

        return strcmp((string) ($right['latestAt'] ?? ''), (string) ($left['latestAt'] ?? ''));
    });

    json_response([
        'summary' => [
            'totalThreads' => count($threads),
            'unreadThreads' => count(array_filter($threads, static fn ($thread) => ($thread['unreadCount'] ?? 0) > 0)),
            'unreadItems' => array_reduce($threads, static fn ($total, $thread) => $total + (int) ($thread['unreadCount'] ?? 0), 0),
        ],
        'threads' => $threads,
    ]);
}

function handle_admin_contact_messages(PDO $db): void
{
    require_admin($db);
    $messages = fetch_all($db, 'SELECT * FROM contact_messages ORDER BY created_at DESC');
    $popupLeads = count(array_filter($messages, static fn ($message): bool => ($message['source'] ?? '') === 'popup'));

    json_response([
        'messages' => array_map('serialize_contact_message_record', $messages),
        'summary' => [
            'total' => count($messages),
            'popupLeads' => $popupLeads,
            'contactPage' => count($messages) - $popupLeads,
        ],
    ]);
}

function handle_admin_get_users(PDO $db): void
{
    require_admin($db);
    $users = fetch_all($db, 'SELECT * FROM users ORDER BY created_at DESC');
    $maps = build_user_summary_maps($db);

    json_response([
        'users' => array_map(static function (array $user) use ($maps): array {
            $serialized = serialize_user_record($user);
            $key = (string) $user['id'];
            $serialized['summary'] = [
                'documents' => $maps['documentMap'][$key]['total'] ?? 0,
                'pendingDocuments' => $maps['documentMap'][$key]['pending'] ?? 0,
                'services' => $maps['serviceMap'][$key]['total'] ?? 0,
                'activeServices' => $maps['serviceMap'][$key]['active'] ?? 0,
                'completedServices' => $maps['serviceMap'][$key]['completed'] ?? 0,
                'payments' => $maps['paymentMap'][$key]['total'] ?? 0,
                'paidAmount' => $maps['paymentMap'][$key]['paid'] ?? 0,
                'pendingPayments' => $maps['paymentMap'][$key]['pending'] ?? 0,
                'appointments' => $maps['appointmentMap'][$key]['total'] ?? 0,
                'pendingAppointments' => $maps['appointmentMap'][$key]['pending'] ?? 0,
            ];
            return $serialized;
        }, $users),
    ]);
}

function handle_admin_get_user_details(PDO $db, string $userId): void
{
    require_admin($db);
    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);

    if ($user === null) {
        throw new AppError(404, 'User not found');
    }

    $documents = fetch_all(
        $db,
        sprintf(
            'SELECT d.*, %s, %s FROM documents d
             LEFT JOIN users up ON up.id = d.uploaded_by_id
             LEFT JOIN users rv ON rv.id = d.reviewed_by_id
             WHERE d.user_id = :userId
             ORDER BY d.created_at DESC',
            user_join_sql('up', 'uploaded_by__'),
            user_join_sql('rv', 'reviewed_by__'),
        ),
        [':userId' => $userId],
    );
    $services = fetch_all(
        $db,
        sprintf(
            'SELECT s.*, %s FROM services s
             LEFT JOIN service_catalog sc ON sc.id = s.catalog_service_id
             WHERE s.user_id = :userId
             ORDER BY s.updated_at DESC, s.created_at DESC',
            catalog_join_sql('sc', 'catalog__'),
        ),
        [':userId' => $userId],
    );
    $payments = fetch_all(
        $db,
        sprintf(
            'SELECT p.*, %s, %s FROM payments p
             LEFT JOIN services s ON s.id = p.service_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             WHERE p.user_id = :userId
             ORDER BY p.created_at DESC',
            prefixed_columns('s', 'service__', ['id', 'type', 'price', 'status']),
            user_join_sql('v', 'verified_by__'),
        ),
        [':userId' => $userId],
    );
    $appointments = fetch_all(
        $db,
        'SELECT * FROM appointments WHERE user_id = :userId ORDER BY scheduled_for DESC, created_at DESC',
        [':userId' => $userId],
    );
    $notifications = fetch_all(
        $db,
        'SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC LIMIT 8',
        [':userId' => $userId],
    );

    $serializedUser = serialize_user_record($user);
    $serializedUser['documents'] = array_map(static fn ($document) => serialize_document_record($document, 'admin'), $documents);
    $serializedUser['services'] = array_map('serialize_service_record', $services);
    $serializedUser['payments'] = array_map('serialize_payment_record', $payments);
    $serializedUser['appointments'] = array_map('serialize_appointment_record', $appointments);
    $serializedUser['notifications'] = array_map('serialize_notification_record', $notifications);

    json_response(['user' => $serializedUser]);
}

function handle_admin_create_user(PDO $db): void
{
    require_admin($db);
    $data = request_data();
    $name = safe_trim($data['name'] ?? '');
    $email = strtolower(safe_trim($data['email'] ?? ''));
    $phone = safe_trim($data['phone'] ?? '');
    $password = safe_trim($data['password'] ?? '');
    $companyName = safe_trim($data['companyName'] ?? '');

    if ($name === '' || $email === '' || $phone === '' || $password === '') {
        throw new AppError(400, 'Name, email, phone, and password are required');
    }

    if (fetch_one($db, 'SELECT id FROM users WHERE email = :email LIMIT 1', [':email' => $email]) !== null) {
        throw new AppError(400, 'A user already exists with this email');
    }

    $now = now_db();
    $userId = uuid_v4();

    insert_row($db, 'users', [
        'id' => $userId,
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'company_name' => $companyName,
        'profile_image' => '',
        'profile_image_zoom' => 1,
        'profile_image_offset_x' => 0,
        'profile_image_offset_y' => 0,
        'is_blocked' => 0,
        'blocked_at' => null,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => 'user',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);
    ensure_client_document_folder((array) $user);

    json_response([
        'message' => 'User created successfully',
        'user' => serialize_user_record((array) $user),
    ], 201);
}

function handle_admin_toggle_user_block(PDO $db, string $userId): void
{
    require_admin($db);
    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);

    if ($user === null) {
        throw new AppError(404, 'User not found');
    }

    if (($user['role'] ?? 'user') === 'admin') {
        throw new AppError(400, 'Admin accounts cannot be blocked from this panel');
    }

    $data = request_data();
    $shouldBlock = array_key_exists('isBlocked', $data) ? bool_from_input($data['isBlocked']) : !(bool) $user['is_blocked'];

    update_row($db, 'users', [
        'is_blocked' => $shouldBlock ? 1 : 0,
        'blocked_at' => $shouldBlock ? now_db() : null,
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $userId]);

    create_notification($db, [
        'userId' => $userId,
        'title' => $shouldBlock ? 'Account temporarily blocked' : 'Account access restored',
        'message' => $shouldBlock
            ? 'Your account has been blocked by the admin team. Please contact support for assistance.'
            : 'Your account has been unblocked and is active again.',
        'category' => 'security',
        'link' => '/dashboard/profile',
        'actionLabel' => 'Open profile',
    ]);

    $freshUser = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);

    json_response([
        'message' => $shouldBlock ? 'User blocked successfully' : 'User unblocked successfully',
        'user' => serialize_user_record((array) $freshUser),
    ]);
}

function handle_admin_delete_user(PDO $db, string $userId): void
{
    require_admin($db);
    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);

    if ($user === null) {
        throw new AppError(404, 'User not found');
    }

    if (($user['role'] ?? 'user') === 'admin') {
        throw new AppError(400, 'Admin accounts cannot be deleted from this panel');
    }

    $documents = fetch_all($db, 'SELECT relative_path, file_url FROM documents WHERE user_id = :userId', [':userId' => $userId]);
    $payments = fetch_all($db, 'SELECT screenshot_url FROM payments WHERE user_id = :userId', [':userId' => $userId]);

    foreach ($documents as $document) {
        delete_upload((string) (($document['file_url'] ?? '') !== '' ? $document['file_url'] : ($document['relative_path'] ?? '')));
    }

    foreach ($payments as $payment) {
        delete_upload($payment['screenshot_url'] ?? '');
    }

    delete_upload($user['profile_image'] ?? '');
    execute_statement($db, 'DELETE FROM users WHERE id = :id', [':id' => $userId]);
    delete_directory_tree(upload_absolute_path('documents/' . build_client_folder_name($user)));
    delete_directory_tree(upload_absolute_path('payments/' . $userId));
    delete_directory_tree(upload_absolute_path('profile/' . $userId));

    json_response(['message' => 'User and related records deleted successfully']);
}

function handle_admin_send_user_message(PDO $db, string $userId): void
{
    require_admin($db);
    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);

    if ($user === null) {
        throw new AppError(404, 'User not found');
    }

    if (($user['role'] ?? 'user') === 'admin') {
        throw new AppError(400, 'Messages can only be sent to client accounts');
    }

    $data = request_data();
    $title = safe_trim($data['title'] ?? 'Admin update', 'Admin update');
    $message = safe_trim($data['message'] ?? '');
    $link = safe_trim($data['link'] ?? '/dashboard/messages', '/dashboard/messages');

    if ($message === '') {
        throw new AppError(400, 'Message text is required');
    }

    $notification = create_notification($db, [
        'userId' => $userId,
        'title' => $title,
        'message' => $message,
        'category' => 'response',
        'link' => $link,
        'actionLabel' => 'Open update',
    ]);

    json_response([
        'message' => 'Response sent successfully',
        'notification' => $notification,
    ], 201);
}

function handle_admin_get_documents(PDO $db): void
{
    require_admin($db);
    $documents = fetch_all(
        $db,
        sprintf(
            'SELECT d.*, %s, %s, %s FROM documents d
             LEFT JOIN users u ON u.id = d.user_id
             LEFT JOIN users up ON up.id = d.uploaded_by_id
             LEFT JOIN users rv ON rv.id = d.reviewed_by_id
             ORDER BY d.created_at DESC',
            user_join_sql('u', 'user__'),
            user_join_sql('up', 'uploaded_by__'),
            user_join_sql('rv', 'reviewed_by__'),
        ),
    );
    $users = fetch_all($db, "SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC");
    $influencerSubmissions = fetch_all(
        $db,
        'SELECT id, user_id, type, status, notes, admin_remarks, created_at
         FROM services
         WHERE influencer_id IS NOT NULL
         ORDER BY created_at DESC',
    );
    foreach ($influencerSubmissions as &$submission) {
        $submission['submitted_fields'] = fetch_all(
            $db,
            'SELECT r.label, r.field_type, v.value_text, v.document_id
             FROM influencer_requirement_values v
             JOIN influencer_requirements r ON r.id = v.influencer_requirement_id
             WHERE v.service_id = :serviceId
             ORDER BY r.sort_order ASC, r.label ASC',
            [':serviceId' => $submission['id']],
        );
    }
    unset($submission);
    $folderMap = [];

    foreach ($users as $user) {
        $folder = ensure_client_document_folder($user);
        $folderMap[(string) $user['id']] = [
            'userId' => (string) $user['id'],
            'name' => $user['name'],
            'folderName' => $folder['folderName'],
            'documentCount' => 0,
            'pendingCount' => 0,
            'approvedCount' => 0,
            'rejectedCount' => 0,
            'lastSubmittedAt' => null,
        ];
    }

    $serializedDocuments = array_map(static fn ($document) => serialize_document_record($document, 'admin'), $documents);

    foreach ($serializedDocuments as $document) {
        $ownerId = $document['user']['_id'] ?? '';

        if ($ownerId === '' || !isset($folderMap[$ownerId])) {
            continue;
        }

        $folderMap[$ownerId]['documentCount'] += 1;
        $folderMap[$ownerId]['folderName'] = $document['storageFolder'] ?: $folderMap[$ownerId]['folderName'];

        if ($document['status'] === 'pending') {
            $folderMap[$ownerId]['pendingCount'] += 1;
        }
        if ($document['status'] === 'approved') {
            $folderMap[$ownerId]['approvedCount'] += 1;
        }
        if ($document['status'] === 'rejected') {
            $folderMap[$ownerId]['rejectedCount'] += 1;
        }

        if ($folderMap[$ownerId]['lastSubmittedAt'] === null || strcmp((string) $document['createdAt'], (string) $folderMap[$ownerId]['lastSubmittedAt']) > 0) {
            $folderMap[$ownerId]['lastSubmittedAt'] = $document['createdAt'];
        }
    }

    $serializedInfluencerSubmissions = array_map(static fn (array $submission): array => [
        '_id' => (string) $submission['id'],
        'userId' => (string) $submission['user_id'],
        'type' => (string) $submission['type'],
        'status' => (string) ($submission['status'] ?? 'pending'),
        'notes' => (string) ($submission['notes'] ?? ''),
        'adminRemarks' => (string) ($submission['admin_remarks'] ?? ''),
        'createdAt' => to_iso8601($submission['created_at'] ?? null),
        'submittedFields' => array_map(static fn (array $field): array => [
            'label' => (string) $field['label'],
            'fieldType' => (string) $field['field_type'],
            'valueText' => (string) ($field['value_text'] ?? ''),
            'documentId' => $field['document_id'] !== null ? (string) $field['document_id'] : '',
        ], $submission['submitted_fields']),
    ], $influencerSubmissions);

    foreach ($serializedInfluencerSubmissions as $submission) {
        $ownerId = $submission['userId'];
        if ($ownerId === '' || !isset($folderMap[$ownerId])) {
            continue;
        }

        if ($folderMap[$ownerId]['lastSubmittedAt'] === null || strcmp((string) $submission['createdAt'], (string) $folderMap[$ownerId]['lastSubmittedAt']) > 0) {
            $folderMap[$ownerId]['lastSubmittedAt'] = $submission['createdAt'];
        }
    }

    $folders = array_values($folderMap);
    usort($folders, static function (array $left, array $right): int {
        if (($left['lastSubmittedAt'] ?? null) === null && ($right['lastSubmittedAt'] ?? null) === null) {
            return strcmp((string) $left['name'], (string) $right['name']);
        }
        if (($left['lastSubmittedAt'] ?? null) === null) {
            return 1;
        }
        if (($right['lastSubmittedAt'] ?? null) === null) {
            return -1;
        }
        return strcmp((string) $right['lastSubmittedAt'], (string) $left['lastSubmittedAt']);
    });

    json_response([
        'documents' => $serializedDocuments,
        'influencerSubmissions' => $serializedInfluencerSubmissions,
        'folders' => $folders,
    ]);
}

function handle_admin_upload_prepared_document(PDO $db): void
{
    if (request_file('file') === null && request_file('preparedFile') !== null) {
        $_FILES['file'] = $_FILES['preparedFile'];
    }

    $data = request_data();
    $title = safe_trim($data['title'] ?? '');

    if ($title !== '' && safe_trim($data['documentType'] ?? '') === '') {
        $_POST['documentType'] = $title;
    }

    handle_upload_document($db, true);
}

function handle_admin_review_document(PDO $db, string $documentId): void
{
    $admin = require_admin($db);
    $document = fetch_one($db, 'SELECT * FROM documents WHERE id = :id LIMIT 1', [':id' => $documentId]);

    if ($document === null) {
        throw new AppError(404, 'Document not found');
    }

    $data = request_data();
    $status = safe_trim($data['status'] ?? ($document['status'] ?? 'pending'), (string) ($document['status'] ?? 'pending'));
    $status = $status === 'verified' ? 'approved' : $status;

    if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
        throw new AppError(400, 'Invalid document status');
    }

    update_row($db, 'documents', [
        'status' => $status,
        'remarks' => safe_trim($data['remarks'] ?? ($document['remarks'] ?? ''), (string) ($document['remarks'] ?? '')),
        'reviewed_by_id' => $admin['id'],
        'reviewed_at' => now_db(),
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $documentId]);

    if ($status === 'approved') {
        open_service_payment_if_documents_are_ready(
            $db,
            (string) $document['user_id'],
            (string) ($document['service_type'] ?? ''),
        );
    }

    create_notification($db, [
        'userId' => $document['user_id'],
        'title' => 'Document review updated',
        'message' => $document['title'] . ' is now marked as ' . $status . '.',
        'category' => 'document',
        'link' => '/dashboard/documents',
        'fileUrl' => $document['file_url'] ?? '',
        'actionLabel' => 'View history',
    ]);

    $updated = fetch_one(
        $db,
        sprintf(
            'SELECT d.*, %s, %s, %s FROM documents d
             LEFT JOIN users u ON u.id = d.user_id
             LEFT JOIN users up ON up.id = d.uploaded_by_id
             LEFT JOIN users rv ON rv.id = d.reviewed_by_id
             WHERE d.id = :id LIMIT 1',
            user_join_sql('u', 'user__'),
            user_join_sql('up', 'uploaded_by__'),
            user_join_sql('rv', 'reviewed_by__'),
        ),
        [':id' => $documentId],
    );

    json_response([
        'message' => 'Document reviewed successfully',
        'document' => serialize_document_record((array) $updated, 'admin'),
    ]);
}

function open_service_payment_if_documents_are_ready(PDO $db, string $userId, string $serviceType): void
{
    if ($userId === '' || $serviceType === '') {
        return;
    }

    $documentSummary = fetch_one(
        $db,
        "SELECT
            COUNT(*) AS total_count,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
         FROM documents
         WHERE user_id = :userId AND service_type = :serviceType",
        [':userId' => $userId, ':serviceType' => $serviceType],
    );

    if ($documentSummary === null || (int) ($documentSummary['approved_count'] ?? 0) === 0 || (int) ($documentSummary['rejected_count'] ?? 0) > 0) {
        return;
    }

    $catalog = fetch_one($db, 'SELECT * FROM service_catalog WHERE name = :serviceType LIMIT 1', [':serviceType' => $serviceType]);
    $service = fetch_one(
        $db,
        'SELECT s.*, sc.price AS catalog_price
         FROM services s
         LEFT JOIN service_catalog sc ON sc.id = s.catalog_service_id
         WHERE s.user_id = :userId AND s.type = :serviceType
         ORDER BY s.updated_at DESC, s.created_at DESC
         LIMIT 1',
        [':userId' => $userId, ':serviceType' => $serviceType],
    );

    $catalogPrice = (float) ($catalog['price'] ?? 0);

    if ($service === null) {
        insert_row($db, 'services', [
            'id' => uuid_v4(),
            'user_id' => $userId,
            'requested_by_client' => 1,
            'catalog_service_id' => $catalog['id'] ?? null,
            'type' => $serviceType,
            'description' => $catalog['description'] ?? '',
            'price' => $catalogPrice,
            'status' => 'approved',
            'priority' => 'medium',
            'notes' => '',
            'admin_remarks' => 'Document approved. Payment is ready.',
            'completed_at' => null,
            'created_at' => now_db(),
            'updated_at' => now_db(),
        ]);
    } elseif (in_array((string) ($service['status'] ?? ''), ['completed', 'rejected'], true)) {
        return;
    } else {
        $price = (float) ($service['price'] ?? 0);
        $joinedCatalogPrice = (float) ($service['catalog_price'] ?? 0);

        update_row($db, 'services', [
            'status' => in_array((string) ($service['status'] ?? ''), ['approved', 'in progress'], true)
                ? (string) $service['status']
                : 'approved',
            'price' => $price > 0 ? $price : ($joinedCatalogPrice > 0 ? $joinedCatalogPrice : $catalogPrice),
            'admin_remarks' => safe_trim(
                $service['admin_remarks'] ?? '',
                'Document approved. Payment is ready.',
            ),
            'updated_at' => now_db(),
        ], 'id = :id', [':id' => $service['id']]);
    }

    $notificationTitle = 'Ready to pay';
    $notificationMessage = $serviceType . ' documents are approved. Payment is now open in your dashboard.';
    $existingNotification = fetch_one(
        $db,
        'SELECT id FROM notifications
         WHERE user_id = :userId AND title = :title AND message = :message AND category = :category
         LIMIT 1',
        [
            ':userId' => $userId,
            ':title' => $notificationTitle,
            ':message' => $notificationMessage,
            ':category' => 'payment',
        ],
    );

    // Dashboard reconciliation runs whenever a user profile loads. Only add
    // this event once for a given service so page visits cannot spam messages.
    if ($existingNotification === null) {
        create_notification($db, [
            'userId' => $userId,
            'title' => $notificationTitle,
            'message' => $notificationMessage,
            'category' => 'payment',
            'link' => '/dashboard/payments',
            'actionLabel' => 'Pay now',
        ]);
    }
}

function reconcile_ready_services_for_user(PDO $db, string $userId): void
{
    if ($userId === '') {
        return;
    }

    $serviceTypes = fetch_all(
        $db,
        "SELECT DISTINCT service_type FROM documents WHERE user_id = :userId AND status = 'approved' AND service_type <> ''",
        [':userId' => $userId],
    );

    foreach ($serviceTypes as $row) {
        open_service_payment_if_documents_are_ready($db, $userId, (string) ($row['service_type'] ?? ''));
    }
}

function handle_admin_delete_document(PDO $db, string $documentId): void
{
    require_admin($db);
    $document = fetch_one(
        $db,
        sprintf('SELECT d.*, %s FROM documents d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = :id LIMIT 1', user_join_sql('u', 'user__')),
        [':id' => $documentId],
    );

    if ($document === null) {
        throw new AppError(404, 'Document not found');
    }

    delete_upload((string) (($document['file_url'] ?? '') !== '' ? $document['file_url'] : ($document['relative_path'] ?? '')));
    execute_statement($db, 'DELETE FROM documents WHERE id = :id', [':id' => $documentId]);

    if (!empty($document['user_id'])) {
        create_notification($db, [
            'userId' => $document['user_id'],
            'title' => 'Document removed',
            'message' => ($document['title'] ?: ($document['original_name'] ?: 'A document')) . ' was removed from your folder by admin.',
            'category' => 'document',
            'link' => '/dashboard/documents',
            'actionLabel' => 'Open documents',
        ]);
    }

    json_response(['message' => 'Document deleted successfully']);
}

function handle_admin_get_service_catalog(PDO $db): void
{
    require_admin($db);
    $services = fetch_all($db, 'SELECT * FROM service_catalog ORDER BY name ASC');
    json_response(['services' => array_map('serialize_service_catalog_record', $services)]);
}

function blog_slug_from_title(string $title): string
{
    $slug = strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '-', $title), '-'));
    return $slug !== '' ? $slug : 'blog-post';
}

function unique_blog_slug(PDO $db, string $title, ?string $ignoreId = null): string
{
    $baseSlug = blog_slug_from_title($title);
    $slug = $baseSlug;
    $counter = 2;

    while (true) {
        $params = [':slug' => $slug];
        $sql = 'SELECT id FROM blogs WHERE slug = :slug';

        if ($ignoreId !== null) {
            $sql .= ' AND id <> :id';
            $params[':id'] = $ignoreId;
        }

        $sql .= ' LIMIT 1';

        if (fetch_one($db, $sql, $params) === null) {
            return $slug;
        }

        $slug = $baseSlug . '-' . $counter;
        $counter += 1;
    }
}

function blog_published_at_from_input(mixed $value, ?string $fallback = null): string
{
    $input = safe_trim($value ?? '');

    if ($input === '') {
        return $fallback ?? now_db();
    }

    try {
        return (new DateTimeImmutable($input))->format('Y-m-d H:i:s');
    } catch (Throwable) {
        throw new AppError(400, 'Published date is invalid');
    }
}

function handle_admin_get_blogs(PDO $db): void
{
    require_admin($db);
    $blogs = fetch_all($db, 'SELECT * FROM blogs ORDER BY published_at DESC, created_at DESC');
    json_response(['blogs' => array_map('serialize_blog_record', $blogs)]);
}

function handle_admin_create_blog(PDO $db): void
{
    require_admin($db);
    $data = request_data();
    $title = safe_trim($data['title'] ?? '');
    $description = safe_trim($data['description'] ?? '');
    $content = safe_trim($data['content'] ?? '');
    $category = safe_trim($data['category'] ?? 'General', 'General');

    if ($title === '' || $description === '' || $content === '') {
        throw new AppError(400, 'Title, description, and content are required');
    }

    $now = now_db();
    $blogId = uuid_v4();

    insert_row($db, 'blogs', [
        'id' => $blogId,
        'title' => $title,
        'slug' => unique_blog_slug($db, $title),
        'description' => $description,
        'content' => $content,
        'category' => $category,
        'published_at' => blog_published_at_from_input($data['publishedAt'] ?? null, $now),
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $blog = fetch_one($db, 'SELECT * FROM blogs WHERE id = :id LIMIT 1', [':id' => $blogId]);

    json_response([
        'message' => 'Blog added successfully',
        'blog' => serialize_blog_record((array) $blog),
    ], 201);
}

function handle_admin_update_blog(PDO $db, string $blogId): void
{
    require_admin($db);
    $blog = fetch_one($db, 'SELECT * FROM blogs WHERE id = :id LIMIT 1', [':id' => $blogId]);

    if ($blog === null) {
        throw new AppError(404, 'Blog post not found');
    }

    $data = request_data();
    $title = safe_trim($data['title'] ?? $blog['title'], (string) $blog['title']);
    $description = safe_trim($data['description'] ?? $blog['description'], (string) $blog['description']);
    $content = safe_trim($data['content'] ?? $blog['content'], (string) $blog['content']);
    $category = safe_trim($data['category'] ?? $blog['category'], (string) ($blog['category'] ?? 'General'));

    if ($title === '' || $description === '' || $content === '') {
        throw new AppError(400, 'Title, description, and content are required');
    }

    update_row($db, 'blogs', [
        'title' => $title,
        'slug' => unique_blog_slug($db, $title, $blogId),
        'description' => $description,
        'content' => $content,
        'category' => $category,
        'published_at' => blog_published_at_from_input($data['publishedAt'] ?? null, (string) $blog['published_at']),
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $blogId]);

    $updated = fetch_one($db, 'SELECT * FROM blogs WHERE id = :id LIMIT 1', [':id' => $blogId]);

    json_response([
        'message' => 'Blog updated successfully',
        'blog' => serialize_blog_record((array) $updated),
    ]);
}

function handle_admin_delete_blog(PDO $db, string $blogId): void
{
    require_admin($db);
    $blog = fetch_one($db, 'SELECT * FROM blogs WHERE id = :id LIMIT 1', [':id' => $blogId]);

    if ($blog === null) {
        throw new AppError(404, 'Blog post not found');
    }

    execute_statement($db, 'DELETE FROM blogs WHERE id = :id', [':id' => $blogId]);
    json_response(['message' => 'Blog deleted successfully']);
}

function handle_admin_create_service_catalog_item(PDO $db): void
{
    require_admin($db);
    $data = request_data();
    $name = safe_trim($data['name'] ?? '');
    $description = safe_trim($data['description'] ?? '');
    $price = number_from_input($data['price'] ?? null, NAN);
    $file = request_file('serviceImage');

    if ($name === '' || is_nan($price)) {
        throw new AppError(400, 'Service name and price are required');
    }

    if (fetch_one($db, 'SELECT id FROM service_catalog WHERE name = :name LIMIT 1', [':name' => $name]) !== null) {
        throw new AppError(400, 'A service with this name already exists');
    }

    $image = '';

    if ($file !== null) {
        $stored = store_uploaded_file(
            $file,
            build_admin_storage_relative_dir('service-catalog'),
            ['png', 'jpg', 'jpeg'],
            ['image/png', 'image/jpeg'],
        );
        $image = $stored['fileUrl'];
    }

    $now = now_db();
    $serviceId = uuid_v4();

    insert_row($db, 'service_catalog', [
        'id' => $serviceId,
        'name' => $name,
        'description' => $description,
        'price' => $price,
        'is_active' => bool_from_input($data['isActive'] ?? true, true) ? 1 : 0,
        'image' => $image,
        'image_zoom' => clamp_number($data['imageZoom'] ?? null, 1, 2.5, 1),
        'image_offset_x' => (int) round(clamp_number($data['imageOffsetX'] ?? null, -35, 35, 0)),
        'image_offset_y' => (int) round(clamp_number($data['imageOffsetY'] ?? null, -35, 35, 0)),
        'sort_order' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $service = fetch_one($db, 'SELECT * FROM service_catalog WHERE id = :id LIMIT 1', [':id' => $serviceId]);

    json_response([
        'message' => 'Service added successfully',
        'service' => serialize_service_catalog_record((array) $service),
    ], 201);
}

function handle_admin_update_service_catalog_item(PDO $db, string $serviceId): void
{
    require_admin($db);
    $service = fetch_one($db, 'SELECT * FROM service_catalog WHERE id = :id LIMIT 1', [':id' => $serviceId]);

    if ($service === null) {
        throw new AppError(404, 'Service not found');
    }

    $data = request_data();
    $file = request_file('serviceImage');
    $name = safe_trim($data['name'] ?? $service['name'], (string) $service['name']);

    if ($name !== (string) $service['name']) {
        $existing = fetch_one(
            $db,
            'SELECT id FROM service_catalog WHERE name = :name AND id <> :id LIMIT 1',
            [':name' => $name, ':id' => $serviceId],
        );

        if ($existing !== null) {
            throw new AppError(400, 'A service with this name already exists');
        }
    }

    $nextImage = $service['image'] ?? '';

    if ($file !== null) {
        $stored = store_uploaded_file(
            $file,
            build_admin_storage_relative_dir('service-catalog'),
            ['png', 'jpg', 'jpeg'],
            ['image/png', 'image/jpeg'],
        );
        $nextImage = $stored['fileUrl'];
    }

    update_row($db, 'service_catalog', [
        'name' => $name,
        'description' => safe_trim($data['description'] ?? $service['description'], (string) ($service['description'] ?? '')),
        'price' => number_from_input($data['price'] ?? $service['price'], (float) $service['price']),
        'is_active' => bool_from_input($data['isActive'] ?? $service['is_active'], (bool) $service['is_active']) ? 1 : 0,
        'image' => $nextImage,
        'image_zoom' => clamp_number($data['imageZoom'] ?? null, 1, 2.5, (float) ($service['image_zoom'] ?? 1)),
        'image_offset_x' => (int) round(clamp_number($data['imageOffsetX'] ?? null, -35, 35, (float) ($service['image_offset_x'] ?? 0))),
        'image_offset_y' => (int) round(clamp_number($data['imageOffsetY'] ?? null, -35, 35, (float) ($service['image_offset_y'] ?? 0))),
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $serviceId]);

    if ($file !== null && ($service['image'] ?? '') !== '' && $service['image'] !== $nextImage) {
        delete_upload((string) $service['image']);
    }

    $updated = fetch_one($db, 'SELECT * FROM service_catalog WHERE id = :id LIMIT 1', [':id' => $serviceId]);

    json_response([
        'message' => 'Service updated successfully',
        'service' => serialize_service_catalog_record((array) $updated),
    ]);
}

function handle_admin_delete_service_catalog_item(PDO $db, string $serviceId): void
{
    require_admin($db);
    $service = fetch_one($db, 'SELECT * FROM service_catalog WHERE id = :id LIMIT 1', [':id' => $serviceId]);

    if ($service === null) {
        throw new AppError(404, 'Service not found');
    }

    execute_statement($db, 'UPDATE services SET catalog_service_id = NULL, updated_at = :updatedAt WHERE catalog_service_id = :id', [
        ':updatedAt' => now_db(),
        ':id' => $serviceId,
    ]);
    delete_upload($service['image'] ?? '');
    execute_statement($db, 'DELETE FROM service_catalog WHERE id = :id', [':id' => $serviceId]);

    json_response(['message' => 'Service deleted successfully']);
}

function handle_admin_get_services(PDO $db): void
{
    require_admin($db);
    $assignments = fetch_all(
        $db,
        sprintf(
            'SELECT s.*, %s, %s FROM services s
             LEFT JOIN users u ON u.id = s.user_id
             LEFT JOIN service_catalog sc ON sc.id = s.catalog_service_id
             ORDER BY s.updated_at DESC, s.created_at DESC',
            user_join_sql('u', 'user__'),
            catalog_join_sql('sc', 'catalog__'),
        ),
    );
    $catalog = fetch_all($db, 'SELECT * FROM service_catalog ORDER BY name ASC');

    json_response([
        'services' => array_map('serialize_service_record', $assignments),
        'catalog' => array_map('serialize_service_catalog_record', $catalog),
    ]);
}

function handle_admin_assign_service(PDO $db): void
{
    require_admin($db);
    $data = request_data();
    $userId = safe_trim($data['userId'] ?? '');

    if ($userId === '') {
        throw new AppError(400, 'User is required');
    }

    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);

    if ($user === null || ($user['role'] ?? 'user') === 'admin') {
        throw new AppError(404, 'Client account not found');
    }

    $catalog = null;
    $catalogServiceId = safe_trim($data['catalogServiceId'] ?? '');

    if ($catalogServiceId !== '') {
        $catalog = fetch_one($db, 'SELECT * FROM service_catalog WHERE id = :id LIMIT 1', [':id' => $catalogServiceId]);

        if ($catalog === null) {
            throw new AppError(404, 'Selected service could not be found');
        }
    }

    $type = $catalog['name'] ?? safe_trim($data['type'] ?? '');

    if ($type === '') {
        throw new AppError(400, 'Service name is required');
    }

    $now = now_db();
    $serviceId = uuid_v4();
    $status = resolve_service_status($data['status'] ?? 'pending');

    insert_row($db, 'services', [
        'id' => $serviceId,
        'user_id' => $userId,
        'requested_by_client' => bool_from_input($data['requestedByClient'] ?? false, false) ? 1 : 0,
        'catalog_service_id' => $catalog['id'] ?? null,
        'type' => $type,
        'description' => safe_trim($data['description'] ?? ($catalog['description'] ?? ''), (string) ($catalog['description'] ?? '')),
        'price' => number_from_input($data['price'] ?? ($catalog['price'] ?? 0), (float) ($catalog['price'] ?? 0)),
        'status' => $status,
        'priority' => safe_trim($data['priority'] ?? 'medium', 'medium'),
        'notes' => safe_trim($data['notes'] ?? ''),
        'admin_remarks' => safe_trim($data['adminRemarks'] ?? ''),
        'completed_at' => $status === 'completed' ? $now : null,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    create_notification($db, [
        'userId' => $userId,
        'title' => 'New service assigned',
        'message' => $type . ' has been added to your dashboard.',
        'category' => 'service',
        'link' => '/dashboard/services',
        'actionLabel' => 'Open service tracker',
    ]);

    $service = fetch_one(
        $db,
        sprintf(
            'SELECT s.*, %s, %s FROM services s
             LEFT JOIN users u ON u.id = s.user_id
             LEFT JOIN service_catalog sc ON sc.id = s.catalog_service_id
             WHERE s.id = :id LIMIT 1',
            user_join_sql('u', 'user__'),
            catalog_join_sql('sc', 'catalog__'),
        ),
        [':id' => $serviceId],
    );

    if ($status === 'completed' && $service !== null) {
        send_service_completion_whatsapp_message($db, (array) $service, $user);
    }

    json_response([
        'message' => 'Service assigned successfully',
        'service' => serialize_service_record((array) $service),
    ], 201);
}

function handle_admin_update_service(PDO $db, string $serviceId): void
{
    require_admin($db);
    $service = fetch_one($db, 'SELECT * FROM services WHERE id = :id LIMIT 1', [':id' => $serviceId]);

    if ($service === null) {
        throw new AppError(404, 'Service not found');
    }

    $data = request_data();
    $status = resolve_service_status($data['status'] ?? $service['status'], (string) $service['status']);

    update_row($db, 'services', [
        'status' => $status,
        'admin_remarks' => safe_trim($data['adminRemarks'] ?? $service['admin_remarks'], (string) ($service['admin_remarks'] ?? '')),
        'notes' => safe_trim($data['notes'] ?? $service['notes'], (string) ($service['notes'] ?? '')),
        'description' => safe_trim($data['description'] ?? $service['description'], (string) ($service['description'] ?? '')),
        'price' => number_from_input($data['price'] ?? $service['price'], (float) $service['price']),
        'requested_by_client' => array_key_exists('requestedByClient', $data)
            ? (bool_from_input($data['requestedByClient']) ? 1 : 0)
            : (int) $service['requested_by_client'],
        'completed_at' => $status === 'completed' ? ($service['completed_at'] ?? now_db()) : null,
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $serviceId]);

    create_notification($db, [
        'userId' => $service['user_id'],
        'title' => 'Service status updated',
        'message' => $service['type'] . ' is now ' . $status . '.',
        'category' => 'service',
        'link' => '/dashboard/services',
        'actionLabel' => 'Open service tracker',
    ]);

    $updated = fetch_one(
        $db,
        sprintf(
            'SELECT s.*, %s, %s FROM services s
             LEFT JOIN users u ON u.id = s.user_id
             LEFT JOIN service_catalog sc ON sc.id = s.catalog_service_id
             WHERE s.id = :id LIMIT 1',
            user_join_sql('u', 'user__'),
            catalog_join_sql('sc', 'catalog__'),
        ),
        [':id' => $serviceId],
    );

    if ($status === 'completed' && $updated !== null) {
        $serviceUser = extract_prefixed_row((array) $updated, 'user__');

        if ($serviceUser !== null) {
            send_service_completion_whatsapp_message($db, (array) $updated, $serviceUser);
        }
    }

    json_response([
        'message' => 'Service updated successfully',
        'service' => serialize_service_record((array) $updated),
    ]);
}

function handle_admin_create_appointment(PDO $db): void
{
    require_admin($db);
    $data = request_data();
    $userId = safe_trim($data['userId'] ?? '');
    $scheduledFor = parse_datetime_input($data['scheduledFor'] ?? null);
    $serviceType = safe_trim($data['serviceType'] ?? 'General consultation', 'General consultation');
    $notes = safe_trim($data['notes'] ?? '');
    $adminNotes = safe_trim($data['adminNotes'] ?? '');
    $status = normalize_appointment_status(safe_trim($data['status'] ?? 'approved', 'approved'));
    $rejectionReason = safe_trim($data['rejectionReason'] ?? '');

    if ($userId === '' || $scheduledFor === null) {
        throw new AppError(400, 'User, date, and time are required');
    }

    if ($status === 'rejected' && $rejectionReason === '') {
        throw new AppError(400, 'A rejection reason is required');
    }

    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $userId]);

    if ($user === null || ($user['role'] ?? 'user') === 'admin') {
        throw new AppError(404, 'Client account not found');
    }

    $appointmentId = uuid_v4();
    $now = now_db();

    insert_row($db, 'appointments', [
        'id' => $appointmentId,
        'user_id' => $userId,
        'scheduled_for' => $scheduledFor,
        'service_type' => $serviceType,
        'notes' => $notes,
        'admin_notes' => $adminNotes,
        'rejection_reason' => $status === 'rejected' ? $rejectionReason : '',
        'status' => $status,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    create_notification($db, [
        'userId' => $userId,
        'title' => 'Appointment booked by admin',
        'message' => build_appointment_notification_message([
            'status' => $status,
            'serviceType' => $serviceType,
            'scheduledFor' => $scheduledFor,
            'rejectionReason' => $rejectionReason,
        ]),
        'category' => 'appointment',
        'link' => '/dashboard/appointments',
        'actionLabel' => 'Open appointments',
    ]);

    $appointment = fetch_one($db, 'SELECT * FROM appointments WHERE id = :id LIMIT 1', [':id' => $appointmentId]);

    if ($appointment !== null) {
        send_appointment_whatsapp_message($db, (array) $appointment, $user);
    }

    json_response([
        'message' => 'Appointment created successfully',
        'appointment' => serialize_appointment_record((array) $appointment),
    ], 201);
}

function handle_admin_get_appointments(PDO $db): void
{
    require_admin($db);
    $appointments = fetch_all(
        $db,
        sprintf(
            'SELECT a.*, %s FROM appointments a
             LEFT JOIN users u ON u.id = a.user_id
             ORDER BY a.scheduled_for DESC, a.created_at DESC',
            user_join_sql('u', 'user__'),
        ),
    );
    $userIds = array_values(array_unique(array_filter(array_map(static fn ($appointment) => $appointment['user_id'] ?? null, $appointments))));
    [$inSql, $inParams] = in_clause($userIds, 'user');

    $documents = $userIds === [] ? [] : fetch_all(
        $db,
        "SELECT user_id, service_type, status, created_at FROM documents WHERE user_id IN ($inSql) ORDER BY created_at DESC",
        $inParams,
    );
    $payments = $userIds === [] ? [] : fetch_all(
        $db,
        "SELECT user_id, service_type, status, verification_status, created_at, paid_at, verified_at FROM payments WHERE user_id IN ($inSql) ORDER BY created_at DESC",
        $inParams,
    );
    $services = $userIds === [] ? [] : fetch_all(
        $db,
        "SELECT user_id, type, status, updated_at, created_at FROM services WHERE user_id IN ($inSql) ORDER BY updated_at DESC, created_at DESC",
        $inParams,
    );

    $documentsByUser = [];
    $paymentsByUser = [];
    $servicesByUser = [];

    foreach ($documents as $document) {
        $documentsByUser[(string) $document['user_id']][] = $document;
    }
    foreach ($payments as $payment) {
        $paymentsByUser[(string) $payment['user_id']][] = $payment;
    }
    foreach ($services as $service) {
        $servicesByUser[(string) $service['user_id']][] = $service;
    }

    $enriched = [];

    foreach ($appointments as $appointment) {
        $userKey = (string) ($appointment['user_id'] ?? '');
        $relatedDocuments = $documentsByUser[$userKey] ?? [];
        $relatedPayments = $paymentsByUser[$userKey] ?? [];
        $relatedServices = $servicesByUser[$userKey] ?? [];
        $serialized = serialize_appointment_record($appointment);
        $selectedService = derive_appointment_service_type($appointment, $relatedServices, $relatedDocuments, $relatedPayments);
        $relevantDocument = pick_latest_record_by_service($relatedDocuments, $selectedService, 'service_type');
        $relevantPayment = pick_latest_record_by_service($relatedPayments, $selectedService, 'service_type');
        $serialized['selectedService'] = $selectedService;
        $serialized['message'] = $serialized['notes'] ?? '';
        $serialized['documentStatus'] = normalize_document_status_for_admin($relevantDocument['status'] ?? null);
        $serialized['paymentStatus'] = normalize_payment_status_for_admin($relevantPayment);
        $serialized['serviceType'] = $serialized['serviceType'] ?: $selectedService;
        $enriched[] = $serialized;
    }

    $summary = [
        'total' => count($enriched),
        'pending' => count(array_filter($enriched, static fn ($appointment) => $appointment['status'] === 'pending')),
        'approved' => count(array_filter($enriched, static fn ($appointment) => $appointment['status'] === 'approved')),
        'rescheduled' => count(array_filter($enriched, static fn ($appointment) => $appointment['status'] === 'rescheduled')),
        'rejected' => count(array_filter($enriched, static fn ($appointment) => $appointment['status'] === 'rejected')),
        'completed' => count(array_filter($enriched, static fn ($appointment) => $appointment['status'] === 'completed')),
        'cancelled' => count(array_filter($enriched, static fn ($appointment) => $appointment['status'] === 'cancelled')),
    ];

    json_response([
        'appointments' => $enriched,
        'summary' => $summary,
    ]);
}

function handle_admin_update_appointment(PDO $db, string $appointmentId): void
{
    require_admin($db);
    $appointment = fetch_one($db, 'SELECT * FROM appointments WHERE id = :id LIMIT 1', [':id' => $appointmentId]);

    if ($appointment === null) {
        throw new AppError(404, 'Appointment not found');
    }

    $data = request_data();
    $nextStatus = normalize_appointment_status(safe_trim($data['status'] ?? $appointment['status'], (string) $appointment['status']));
    $scheduledFor = array_key_exists('scheduledFor', $data)
        ? parse_datetime_input($data['scheduledFor'])
        : ($appointment['scheduled_for'] ?? null);
    $rejectionReason = array_key_exists('rejectionReason', $data)
        ? safe_trim($data['rejectionReason'] ?? '')
        : safe_trim($appointment['rejection_reason'] ?? '');

    if ($nextStatus === 'rejected' && $rejectionReason === '') {
        throw new AppError(400, 'A rejection reason is required');
    }

    if ($nextStatus === 'rescheduled' && $scheduledFor === null) {
        throw new AppError(400, 'A new appointment date and time are required to reschedule');
    }

    update_row($db, 'appointments', [
        'scheduled_for' => $scheduledFor,
        'service_type' => safe_trim($data['serviceType'] ?? $appointment['service_type'], (string) ($appointment['service_type'] ?? 'General consultation')),
        'admin_notes' => safe_trim($data['adminNotes'] ?? $appointment['admin_notes'], (string) ($appointment['admin_notes'] ?? '')),
        'rejection_reason' => $nextStatus === 'rejected' ? $rejectionReason : '',
        'status' => $nextStatus,
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $appointmentId]);

    $updated = fetch_one($db, 'SELECT * FROM appointments WHERE id = :id LIMIT 1', [':id' => $appointmentId]);

    create_notification($db, [
        'userId' => $appointment['user_id'],
        'title' => 'Appointment updated',
        'message' => build_appointment_notification_message([
            'status' => $nextStatus,
            'serviceType' => $updated['service_type'] ?? 'General consultation',
            'scheduledFor' => $updated['scheduled_for'] ?? null,
            'rejectionReason' => $updated['rejection_reason'] ?? '',
        ]),
        'category' => 'appointment',
        'link' => '/dashboard/appointments',
        'actionLabel' => 'Open appointments',
    ]);

    json_response([
        'message' => 'Appointment updated successfully',
        'appointment' => serialize_appointment_record((array) $updated),
    ]);
}

function handle_admin_get_payments(PDO $db): void
{
    require_admin($db);
    $payments = fetch_all(
        $db,
        sprintf(
            'SELECT p.*, %s, %s, %s FROM payments p
             LEFT JOIN users u ON u.id = p.user_id
             LEFT JOIN services s ON s.id = p.service_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             ORDER BY p.created_at DESC',
            user_join_sql('u', 'user__'),
            prefixed_columns('s', 'service__', ['id', 'type', 'price', 'status']),
            user_join_sql('v', 'verified_by__'),
        ),
    );

    $serialized = array_map('serialize_payment_record', $payments);

    json_response([
        'payments' => $serialized,
        'summary' => [
            'total' => count($serialized),
            'totalEarnings' => array_reduce($serialized, static fn ($total, $payment) => $total + ($payment['status'] === 'paid' ? (float) $payment['amount'] : 0), 0),
            'pendingAmount' => array_reduce($serialized, static fn ($total, $payment) => $total + (($payment['status'] === 'pending' || $payment['verificationStatus'] === 'pending') ? (float) $payment['amount'] : 0), 0),
            'rejectedAmount' => array_reduce($serialized, static fn ($total, $payment) => $total + (($payment['status'] === 'rejected' || $payment['verificationStatus'] === 'rejected') ? (float) $payment['amount'] : 0), 0),
            'pending' => count(array_filter($serialized, static fn ($payment) => $payment['status'] === 'pending' || $payment['verificationStatus'] === 'pending')),
            'verified' => count(array_filter($serialized, static fn ($payment) => $payment['verificationStatus'] === 'verified')),
            'rejected' => count(array_filter($serialized, static fn ($payment) => $payment['verificationStatus'] === 'rejected')),
            'manual' => count(array_filter($serialized, static fn ($payment) => $payment['paymentMethod'] === 'manual')),
            'online' => count(array_filter($serialized, static fn ($payment) => $payment['paymentMethod'] === 'online')),
        ],
    ]);
}

function handle_admin_get_payment_receipt(PDO $db, string $paymentId): void
{
    require_admin($db);
    $payment = fetch_one(
        $db,
        sprintf(
            'SELECT p.*, %s, %s
             FROM payments p
             LEFT JOIN users u ON u.id = p.user_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             WHERE p.id = :id LIMIT 1',
            user_join_sql('u', 'user__'),
            user_join_sql('v', 'verified_by__'),
        ),
        [':id' => $paymentId],
    );

    if ($payment === null) {
        throw new AppError(404, 'Payment not found');
    }

    send_payment_receipt($payment);
}

function handle_admin_update_payment(PDO $db, string $paymentId): void
{
    $admin = require_admin($db);
    $payment = fetch_one($db, 'SELECT * FROM payments WHERE id = :id LIMIT 1', [':id' => $paymentId]);

    if ($payment === null) {
        throw new AppError(404, 'Payment not found');
    }

    $data = request_data();
    $verificationStatus = safe_trim($data['verificationStatus'] ?? $payment['verification_status'], (string) $payment['verification_status']);

    if (!in_array($verificationStatus, ['pending', 'verified', 'rejected'], true)) {
        throw new AppError(400, 'Invalid payment verification status');
    }

    $status = (string) $payment['status'];
    $verifiedById = $payment['verified_by_id'];
    $verifiedAt = $payment['verified_at'];
    $paidAt = $payment['paid_at'];

    if ($verificationStatus === 'verified') {
        $status = 'paid';
        $verifiedById = $admin['id'];
        $verifiedAt = now_db();
        $paidAt = $paidAt ?? now_db();
    } elseif ($verificationStatus === 'rejected') {
        $status = 'rejected';
        $verifiedById = $admin['id'];
        $verifiedAt = now_db();
    } else {
        $status = 'pending';
        $verifiedById = null;
        $verifiedAt = null;
        $paidAt = ($payment['payment_method'] ?? 'online') === 'online' ? $paidAt : null;
    }

    if (safe_trim($data['status'] ?? '') !== '') {
        $status = safe_trim($data['status']);
    }

    update_row($db, 'payments', [
        'transaction_id' => array_key_exists('transactionId', $data)
            ? safe_trim($data['transactionId'] ?? '', (string) ($payment['transaction_id'] ?? ''))
            : (string) ($payment['transaction_id'] ?? ''),
        'review_remarks' => array_key_exists('reviewRemarks', $data)
            ? safe_trim($data['reviewRemarks'] ?? '', (string) ($payment['review_remarks'] ?? ''))
            : (string) ($payment['review_remarks'] ?? ''),
        'verification_status' => $verificationStatus,
        'status' => $status,
        'verified_by_id' => $verifiedById,
        'verified_at' => $verifiedAt,
        'paid_at' => $paidAt,
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $paymentId]);

    create_payment_event($db, [
        'paymentId' => $paymentId,
        'userId' => $payment['user_id'],
        'eventType' => 'payment.admin_updated',
        'source' => 'admin',
        'message' => 'Admin updated payment status.',
        'payload' => [
            'status' => $status,
            'verificationStatus' => $verificationStatus,
            'adminId' => $admin['id'],
        ],
    ]);

    $moved = $verificationStatus === 'verified'
        ? mark_service_in_progress_after_payment($db, $payment['service_id'] ?? null)
        : false;

    $paymentStatusMessage = $verificationStatus === 'verified'
        ? ($moved
            ? $payment['invoice_number'] . ' has been verified successfully. ' . $payment['service_type'] . ' is now in progress.'
            : $payment['invoice_number'] . ' has been verified successfully.')
        : ($verificationStatus === 'rejected'
            ? $payment['invoice_number'] . ' has been rejected. Please review the admin remarks.'
            : $payment['invoice_number'] . ' is now marked as ' . $status . '.');

    create_notification($db, [
        'userId' => $payment['user_id'],
        'title' => 'Payment status updated',
        'message' => $paymentStatusMessage,
        'category' => 'payment',
        'link' => '/dashboard/payments',
        'actionLabel' => 'Open payments',
    ]);

    $updated = fetch_one(
        $db,
        sprintf(
            'SELECT p.*, %s, %s, %s FROM payments p
             LEFT JOIN users u ON u.id = p.user_id
             LEFT JOIN services s ON s.id = p.service_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             WHERE p.id = :id LIMIT 1',
            user_join_sql('u', 'user__'),
            prefixed_columns('s', 'service__', ['id', 'type', 'price', 'status']),
            user_join_sql('v', 'verified_by__'),
        ),
        [':id' => $paymentId],
    );

    if ($verificationStatus === 'verified' && $updated !== null) {
        $paymentUser = extract_prefixed_row((array) $updated, 'user__');

        if ($paymentUser !== null) {
            send_payment_whatsapp_message($db, (array) $updated, $paymentUser);
        }
    }

    json_response([
        'message' => 'Payment updated successfully',
        'payment' => serialize_payment_record((array) $updated),
    ]);
}

function handle_admin_delete_payment(PDO $db, string $paymentId): void
{
    $admin = require_admin($db);
    $payment = fetch_one($db, 'SELECT * FROM payments WHERE id = :id LIMIT 1', [':id' => $paymentId]);

    if ($payment === null) {
        throw new AppError(404, 'Payment not found');
    }

    if (($payment['screenshot_url'] ?? '') !== '') {
        delete_upload((string) $payment['screenshot_url']);
    }

    execute_statement($db, 'DELETE FROM payments WHERE id = :id', [':id' => $paymentId]);

    create_payment_event($db, [
        'paymentId' => null,
        'userId' => $payment['user_id'],
        'eventType' => 'payment.admin_deleted',
        'source' => 'admin',
        'message' => 'Admin deleted payment ' . ($payment['invoice_number'] ?? $paymentId) . '.',
        'payload' => [
            'paymentId' => $paymentId,
            'invoiceNumber' => $payment['invoice_number'] ?? '',
            'adminId' => $admin['id'],
        ],
    ]);

    create_notification($db, [
        'userId' => $payment['user_id'],
        'title' => 'Payment record removed',
        'message' => ($payment['invoice_number'] ?? 'A payment record') . ' was removed by admin.',
        'category' => 'payment',
        'link' => '/dashboard/payments',
        'actionLabel' => 'Open payments',
    ]);

    json_response(['message' => 'Payment deleted successfully']);
}
