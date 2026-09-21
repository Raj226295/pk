<?php
declare(strict_types=1);

function handle_register(PDO $db): void
{
    $data = request_data();
    $name = safe_trim($data['name'] ?? '');
    $email = strtolower(safe_trim($data['email'] ?? ''));
    $phone = safe_trim($data['phone'] ?? '');
    $password = safe_trim($data['password'] ?? '');

    if ($name === '' || $email === '' || $phone === '' || $password === '') {
        throw new AppError(400, 'Please provide name, email, phone, and password');
    }

    if (fetch_one($db, 'SELECT id FROM users WHERE email = :email LIMIT 1', [':email' => $email]) !== null) {
        throw new AppError(400, 'User already exists with this email');
    }

    $now = now_db();
    $id = uuid_v4();

    insert_row($db, 'users', [
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'company_name' => '',
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

    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $id]);
    ensure_client_document_folder($user ?? ['id' => $id, 'name' => $name, 'email' => $email]);

    json_response([
        'token' => issue_token($id),
        'user' => serialize_user_record((array) $user),
    ], 201);
}

function handle_login(PDO $db): void
{
    $data = request_data();
    $identifier = safe_trim($data['identifier'] ?? $data['email'] ?? '');
    $password = safe_trim($data['password'] ?? '');

    if ($identifier === '' || $password === '') {
        throw new AppError(400, 'Please provide your email or phone number and password');
    }

    // Determine if the identifier looks like a phone number or an email
    $isPhone = preg_match('/^[0-9+\-\s]{7,15}$/', $identifier);

    if ($isPhone) {
        $user = fetch_one($db, 'SELECT * FROM users WHERE phone = :identifier LIMIT 1', [':identifier' => $identifier]);
    } else {
        $user = fetch_one($db, 'SELECT * FROM users WHERE email = :identifier LIMIT 1', [':identifier' => strtolower($identifier)]);
    }

    if ($user !== null && (int) $user['is_blocked'] === 1) {
        throw new AppError(403, 'This account has been blocked. Please contact the admin.');
    }

    if ($user === null || !password_verify($password, $user['password_hash'])) {
        throw new AppError(401, 'Invalid email/phone or password');
    }

    json_response([
        'token' => issue_token((string) $user['id']),
        'user' => serialize_user_record($user),
    ]);
}

function handle_get_blogs(PDO $db): void
{
    $blogs = fetch_all($db, 'SELECT * FROM blogs ORDER BY published_at DESC, created_at DESC');
    json_response(['blogs' => array_map('serialize_blog_record', $blogs)]);
}

function handle_get_blog_by_slug(PDO $db, string $slug): void
{
    $blog = fetch_one($db, 'SELECT * FROM blogs WHERE slug = :slug LIMIT 1', [':slug' => $slug]);

    if ($blog === null) {
        throw new AppError(404, 'Blog post not found');
    }

    json_response(['blog' => serialize_blog_record($blog)]);
}

function handle_submit_contact(PDO $db): void
{
    $data = request_data();
    $name = safe_trim($data['name'] ?? '');
    $email = safe_trim($data['email'] ?? '');
    $phone = safe_trim($data['phone'] ?? '');
    $message = safe_trim($data['message'] ?? '');
    $source = safe_trim($data['source'] ?? 'contact', 'contact');
    $pageUrl = safe_trim($data['pageUrl'] ?? '');

    if ($name === '' || $email === '' || $phone === '') {
        throw new AppError(400, 'Please provide your name, email, and phone number');
    }

    if ($message === '') {
        $message = 'Requested a callback from the website popup.';
    }

    insert_row($db, 'contact_messages', [
        'id' => uuid_v4(),
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'message' => $message,
        'source' => substr($source, 0, 50),
        'page_url' => substr($pageUrl, 0, 255),
        'created_at' => now_db(),
    ]);

    json_response(['message' => 'Contact inquiry submitted successfully'], 201);
}

function handle_get_public_service_catalog(PDO $db): void
{
    $services = fetch_all($db, 'SELECT * FROM service_catalog WHERE is_active = 1 ORDER BY sort_order ASC, name ASC');
    json_response(['services' => array_map('serialize_service_catalog_record', $services)]);
}

function handle_get_profile(PDO $db): void
{
    $user = current_user($db);
    json_response(['user' => serialize_user_record($user)]);
}

function handle_update_profile(PDO $db): void
{
    $current = current_user($db);
    $data = request_data();
    $email = strtolower(safe_trim($data['email'] ?? $current['email'], (string) $current['email']));

    if ($email !== strtolower((string) $current['email'])) {
        $existing = fetch_one(
            $db,
            'SELECT id FROM users WHERE email = :email AND id <> :id LIMIT 1',
            [':email' => $email, ':id' => $current['id']],
        );

        if ($existing !== null) {
            throw new AppError(400, 'Email is already in use');
        }
    }

    update_row($db, 'users', [
        'name' => safe_trim($data['name'] ?? $current['name'], (string) $current['name']),
        'email' => $email,
        'phone' => safe_trim($data['phone'] ?? $current['phone'], (string) $current['phone']),
        'company_name' => safe_trim($data['companyName'] ?? $current['company_name'], (string) ($current['company_name'] ?? '')),
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $current['id']]);

    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $current['id']]);

    json_response([
        'message' => 'Profile updated successfully',
        'user' => serialize_user_record((array) $user),
    ]);
}

function handle_update_profile_image(PDO $db): void
{
    $current = current_user($db);
    $data = request_data();
    $file = request_file('profileImage');

    if ($file === null && (($current['profile_image'] ?? '') === '')) {
        throw new AppError(400, 'Please upload a profile image');
    }

    $nextImage = $current['profile_image'] ?? '';

    if ($file !== null) {
        $stored = store_uploaded_file(
            $file,
            build_user_storage_relative_dir((string) $current['id'], 'profile'),
            ['png', 'jpg', 'jpeg'],
            ['image/png', 'image/jpeg'],
        );
        $nextImage = $stored['fileUrl'];
    }

    update_row($db, 'users', [
        'profile_image' => $nextImage,
        'profile_image_zoom' => clamp_number($data['zoom'] ?? null, 1, 2.5, (float) ($current['profile_image_zoom'] ?? 1)),
        'profile_image_offset_x' => (int) round(clamp_number($data['offsetX'] ?? null, -35, 35, (float) ($current['profile_image_offset_x'] ?? 0))),
        'profile_image_offset_y' => (int) round(clamp_number($data['offsetY'] ?? null, -35, 35, (float) ($current['profile_image_offset_y'] ?? 0))),
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $current['id']]);

    if ($file !== null && ($current['profile_image'] ?? '') !== '' && $current['profile_image'] !== $nextImage) {
        delete_upload((string) $current['profile_image']);
    }

    $user = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $current['id']]);

    json_response([
        'message' => 'Profile image updated successfully',
        'user' => serialize_user_record((array) $user),
    ]);
}

function handle_change_password(PDO $db): void
{
    $current = current_user($db);
    $data = request_data();
    $currentPassword = safe_trim($data['currentPassword'] ?? '');
    $newPassword = safe_trim($data['newPassword'] ?? '');

    if ($currentPassword === '' || $newPassword === '') {
        throw new AppError(400, 'Current password and new password are required');
    }

    if (!password_verify($currentPassword, (string) $current['password_hash'])) {
        throw new AppError(400, 'Current password is incorrect');
    }

    update_row($db, 'users', [
        'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $current['id']]);

    json_response(['message' => 'Password updated successfully']);
}

function handle_get_service_catalog_for_users(PDO $db): void
{
    current_user($db);
    handle_get_public_service_catalog($db);
}

function handle_get_user_services(PDO $db): void
{
    $user = current_user($db);
    reconcile_ready_services_for_user($db, (string) $user['id']);
    $services = fetch_all(
        $db,
        sprintf(
            'SELECT s.*, %s FROM services s LEFT JOIN service_catalog sc ON sc.id = s.catalog_service_id WHERE s.user_id = :userId ORDER BY s.updated_at DESC, s.created_at DESC',
            catalog_join_sql('sc', 'catalog__'),
        ),
        [':userId' => $user['id']],
    );

    json_response(['services' => array_map('serialize_service_record', $services)]);
}

function handle_request_service(PDO $db): void
{
    $user = current_user($db);
    $data = request_data();
    $catalogServiceId = safe_trim($data['catalogServiceId'] ?? '');

    if ($catalogServiceId === '') {
        throw new AppError(400, 'Please select a service');
    }

    $catalog = fetch_one($db, 'SELECT * FROM service_catalog WHERE id = :id LIMIT 1', [':id' => $catalogServiceId]);

    if ($catalog === null || (int) $catalog['is_active'] !== 1) {
        throw new AppError(404, 'Selected service is not available');
    }

    $existing = fetch_one(
        $db,
        "SELECT id FROM services WHERE user_id = :userId AND catalog_service_id = :catalogId AND status IN ('pending', 'approved', 'in progress') LIMIT 1",
        [':userId' => $user['id'], ':catalogId' => $catalogServiceId],
    );

    if ($existing !== null) {
        throw new AppError(400, 'This service is already active in your dashboard');
    }

    $now = now_db();
    $serviceId = uuid_v4();

    insert_row($db, 'services', [
        'id' => $serviceId,
        'user_id' => $user['id'],
        'requested_by_client' => 1,
        'catalog_service_id' => $catalogServiceId,
        'type' => $catalog['name'],
        'description' => $catalog['description'] ?? '',
        'price' => 0,
        'status' => 'pending',
        'priority' => 'medium',
        'notes' => safe_trim($data['notes'] ?? ''),
        'admin_remarks' => '',
        'completed_at' => null,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    create_notification($db, [
        'userId' => $user['id'],
        'title' => 'Service request submitted',
        'message' => $catalog['name'] . ' has been added to your dashboard for admin review. Price will be shared after document verification.',
        'category' => 'service',
        'link' => '/dashboard/services',
        'actionLabel' => 'View service',
    ]);

    $service = fetch_one(
        $db,
        sprintf(
            'SELECT s.*, %s FROM services s LEFT JOIN service_catalog sc ON sc.id = s.catalog_service_id WHERE s.id = :id LIMIT 1',
            catalog_join_sql('sc', 'catalog__'),
        ),
        [':id' => $serviceId],
    );

    json_response([
        'message' => 'Service selected successfully',
        'service' => serialize_service_record((array) $service),
    ], 201);
}

function handle_upload_document(PDO $db, bool $adminMode): void
{
    $current = $adminMode ? require_admin($db) : current_user($db);
    $data = request_data();
    $file = request_file('file');
    $inputType = safe_trim($data['inputType'] ?? 'file', 'file') === 'text' ? 'text' : 'file';
    $textValue = safe_trim($data['textValue'] ?? '');

    if ($inputType === 'file' && $file === null) {
        throw new AppError(400, 'Please upload a PDF or image file');
    }

    if ($inputType === 'text' && $textValue === '') {
        throw new AppError(400, 'Please enter the required text details');
    }

    $title = safe_trim($data['title'] ?? $data['documentType'] ?? '');
    $documentType = safe_trim($data['documentType'] ?? $title, $title);
    $serviceType = safe_trim($data['serviceType'] ?? 'General', 'General');
    $notes = safe_trim($data['notes'] ?? '');

    if ($title === '' || $documentType === '') {
        throw new AppError(400, 'Document type is required');
    }

    $owner = $current;

    if ($adminMode && safe_trim($data['userId'] ?? '') !== '') {
        $target = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => safe_trim($data['userId'])]);

        if ($target === null) {
            throw new AppError(404, 'Selected user not found');
        }

        $owner = $target;
    }

    $folder = ensure_client_document_folder($owner, $serviceType);
    $stored = [
        'filename' => '',
        'originalName' => '',
        'relativePath' => '',
        'storageFolder' => $folder['relativeDir'],
        'fileUrl' => '',
        'mimeType' => 'text/plain',
    ];

    if ($inputType === 'file') {
        $stored = store_uploaded_file(
            $file,
            $folder['relativeDir'],
            ['pdf', 'png', 'jpg', 'jpeg'],
            ['application/pdf', 'image/png', 'image/jpeg'],
        );
    }
    $now = now_db();
    $documentId = uuid_v4();
    $isAdminSharedDocument = $adminMode && (string) $owner['id'] !== (string) $current['id'];

    insert_row($db, 'documents', [
        'id' => $documentId,
        'user_id' => $owner['id'],
        'uploaded_by_id' => $current['id'],
        'title' => $title,
        'document_type' => $documentType,
        'service_type' => $serviceType,
        'input_type' => $inputType,
        'text_value' => $inputType === 'text' ? $textValue : '',
        'filename' => $stored['filename'],
        'original_name' => $stored['originalName'],
        'relative_path' => $stored['relativePath'],
        'storage_folder' => $stored['storageFolder'],
        'file_url' => $stored['fileUrl'],
        'mime_type' => $stored['mimeType'],
        'status' => $isAdminSharedDocument ? 'approved' : 'pending',
        'remarks' => '',
        'notes' => $notes,
        'reviewed_by_id' => $isAdminSharedDocument ? $current['id'] : null,
        'reviewed_at' => $isAdminSharedDocument ? $now : null,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    if ($adminMode && $owner['id'] !== $current['id']) {
        create_notification($db, [
            'userId' => $owner['id'],
            'title' => 'New document shared',
            'message' => $current['name'] . ' shared ' . $title . ' with your account.',
            'category' => 'document',
            'link' => '/dashboard/documents',
            'fileUrl' => $stored['fileUrl'],
            'actionLabel' => 'Open document',
        ]);
    } else {
        create_notification($db, [
            'userId' => $owner['id'],
            'title' => 'Document uploaded',
            'message' => $title . ' has been uploaded and is awaiting review.',
            'category' => 'document',
            'link' => '/dashboard/documents',
            'fileUrl' => $stored['fileUrl'],
            'actionLabel' => 'Open document',
        ]);
    }

    $document = fetch_one(
        $db,
        sprintf(
            'SELECT d.*, %s, %s FROM documents d LEFT JOIN users u ON u.id = d.user_id LEFT JOIN users up ON up.id = d.uploaded_by_id WHERE d.id = :id LIMIT 1',
            user_join_sql('u', 'user__'),
            user_join_sql('up', 'uploaded_by__'),
        ),
        [':id' => $documentId],
    );

    json_response([
        'message' => $adminMode && $owner['id'] !== $current['id'] ? 'Document shared successfully' : 'Document uploaded successfully',
        'document' => serialize_document_record((array) $document, $adminMode ? 'admin' : 'user'),
    ], 201);
}

function handle_get_user_documents(PDO $db): void
{
    $user = current_user($db);
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
        [':userId' => $user['id']],
    );

    json_response([
        'documents' => array_map(static fn ($document) => serialize_document_record($document, 'user'), $documents),
    ]);
}

function handle_download_document(PDO $db, string $documentId, bool $adminMode): void
{
    $requester = $adminMode ? require_admin($db) : current_user($db);
    $document = find_accessible_document($db, $documentId, $requester, $adminMode);

    if (($document['input_type'] ?? 'file') === 'text') {
        throw new AppError(400, 'This entry contains text details and does not have a downloadable file');
    }

    send_download_file(
        (string) ($document['relative_path'] ?? ''),
        (string) (($document['original_name'] ?? '') !== '' ? $document['original_name'] : $document['filename']),
        (string) ($document['file_url'] ?? ''),
        (string) ($document['mime_type'] ?? 'application/octet-stream'),
    );
}

function handle_create_appointment(PDO $db): void
{
    $user = current_user($db);
    $data = request_data();
    $scheduledFor = parse_datetime_input($data['scheduledFor'] ?? null);
    $serviceType = safe_trim($data['serviceType'] ?? 'General consultation', 'General consultation');
    $notes = safe_trim($data['notes'] ?? '');

    if ($scheduledFor === null) {
        throw new AppError(400, 'Appointment date and time are required');
    }

    $now = now_db();
    $appointmentId = uuid_v4();

    insert_row($db, 'appointments', [
        'id' => $appointmentId,
        'user_id' => $user['id'],
        'scheduled_for' => $scheduledFor,
        'service_type' => $serviceType,
        'notes' => $notes,
        'admin_notes' => '',
        'rejection_reason' => '',
        'status' => 'pending',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    create_notification($db, [
        'userId' => $user['id'],
        'title' => 'Appointment request submitted',
        'message' => "Your {$serviceType} consultation request has been submitted for admin review.",
        'category' => 'appointment',
        'link' => '/dashboard/appointments',
        'actionLabel' => 'Open appointments',
    ]);

    $appointment = fetch_one($db, 'SELECT * FROM appointments WHERE id = :id LIMIT 1', [':id' => $appointmentId]);

    if ($appointment !== null) {
        send_appointment_whatsapp_message($db, (array) $appointment, $user);
    }

    json_response([
        'message' => 'Appointment booked successfully',
        'appointment' => serialize_appointment_record((array) $appointment),
    ], 201);
}

function handle_get_user_appointments(PDO $db): void
{
    $user = current_user($db);
    $appointments = fetch_all(
        $db,
        'SELECT * FROM appointments WHERE user_id = :userId ORDER BY scheduled_for DESC, created_at DESC',
        [':userId' => $user['id']],
    );

    json_response([
        'appointments' => array_map('serialize_appointment_record', $appointments),
    ]);
}

function handle_get_user_payments(PDO $db): void
{
    $user = current_user($db);
    $payments = fetch_all(
        $db,
        sprintf(
            'SELECT p.*, %s, %s
             FROM payments p
             LEFT JOIN services s ON s.id = p.service_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             WHERE p.user_id = :userId
             ORDER BY p.created_at DESC',
            prefixed_columns('s', 'service__', ['id', 'type', 'price', 'status']),
            user_join_sql('v', 'verified_by__'),
        ),
        [':userId' => $user['id']],
    );

    json_response(['payments' => array_map('serialize_payment_record', $payments)]);
}

function handle_get_user_payment_receipt(PDO $db, string $paymentId): void
{
    $user = current_user($db);
    $payment = fetch_one(
        $db,
        sprintf(
            'SELECT p.*, %s, %s
             FROM payments p
             LEFT JOIN users u ON u.id = p.user_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             WHERE p.id = :id AND p.user_id = :userId LIMIT 1',
            user_join_sql('u', 'user__'),
            user_join_sql('v', 'verified_by__'),
        ),
        [':id' => $paymentId, ':userId' => $user['id']],
    );

    if ($payment === null) {
        throw new AppError(404, 'Payment not found');
    }

    send_payment_receipt($payment);
}

function handle_upload_payment_receipt(PDO $db, string $paymentId): void
{
    $user = current_user($db);
    $payment = fetch_one(
        $db,
        'SELECT * FROM payments WHERE id = :id AND user_id = :userId LIMIT 1',
        [':id' => $paymentId, ':userId' => $user['id']],
    );

    if ($payment === null) {
        throw new AppError(404, 'Payment not found');
    }

    if (($payment['verification_status'] ?? '') === 'verified' || ($payment['status'] ?? '') === 'paid') {
        throw new AppError(400, 'This payment is already verified');
    }

    $receipt = request_file('receipt');

    if ($receipt === null) {
        throw new AppError(400, 'Please choose a receipt file to upload');
    }

    $data = request_data();
    $transactionId = safe_trim($data['transactionId'] ?? '', (string) ($payment['transaction_id'] ?? ''));

    if ($transactionId === '') {
        throw new AppError(400, 'Please enter the transaction ID or UPI reference number');
    }

    $storedReceipt = store_uploaded_file(
        $receipt,
        build_user_storage_relative_dir((string) $user['id'], (string) $payment['service_type']),
        ['pdf', 'png', 'jpg', 'jpeg'],
        ['application/pdf', 'image/png', 'image/jpeg'],
    );

    if (($payment['screenshot_url'] ?? '') !== '') {
        delete_upload((string) $payment['screenshot_url']);
    }

    update_row($db, 'payments', [
        'payment_method' => ($payment['payment_method'] ?? '') === 'online' ? 'online' : 'manual',
        'transaction_id' => $transactionId,
        'screenshot_url' => $storedReceipt['fileUrl'],
        'screenshot_name' => $storedReceipt['originalName'],
        'screenshot_type' => $storedReceipt['mimeType'],
        'verification_status' => 'pending',
        'status' => 'pending',
        'review_remarks' => '',
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $paymentId]);

    create_payment_event($db, [
        'paymentId' => $paymentId,
        'userId' => $user['id'],
        'eventType' => 'payment.receipt_uploaded',
        'source' => 'user',
        'message' => 'User uploaded payment receipt for admin verification.',
        'payload' => [
            'transactionId' => $transactionId,
            'receiptName' => $storedReceipt['originalName'],
            'receiptType' => $storedReceipt['mimeType'],
        ],
    ]);

    create_notification($db, [
        'userId' => $user['id'],
        'title' => 'Payment receipt uploaded',
        'message' => ($payment['invoice_number'] ?? 'Your payment') . ' receipt has been sent for admin verification.',
        'category' => 'payment',
        'link' => '/dashboard/payments',
        'actionLabel' => 'Open payments',
    ]);

    $freshPayment = fetch_one(
        $db,
        sprintf(
            'SELECT p.*, %s, %s FROM payments p
             LEFT JOIN services s ON s.id = p.service_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             WHERE p.id = :id LIMIT 1',
            prefixed_columns('s', 'service__', ['id', 'type', 'price', 'status']),
            user_join_sql('v', 'verified_by__'),
        ),
        [':id' => $paymentId],
    );

    json_response([
        'message' => 'Receipt uploaded successfully. Admin will verify it shortly.',
        'payment' => serialize_payment_record((array) $freshPayment),
    ]);
}

function handle_create_payment(PDO $db): void
{
    $user = current_user($db);
    $data = request_data();
    $serviceId = safe_trim($data['serviceId'] ?? '');
    $description = safe_trim($data['description'] ?? '');
    $transactionId = safe_trim($data['transactionId'] ?? '');
    $paymentMethod = safe_trim($data['paymentMethod'] ?? 'online', 'online') === 'manual' ? 'manual' : 'online';
    $screenshot = request_file('screenshot');

    if ($serviceId === '') {
        throw new AppError(400, 'Please choose a service for payment');
    }

    if ($paymentMethod === 'manual' && $screenshot === null) {
        throw new AppError(400, 'Please upload a payment screenshot for manual verification');
    }

    if ($paymentMethod === 'manual' && $transactionId === '') {
        throw new AppError(400, 'Please enter the transaction ID or UPI reference number');
    }

    $service = fetch_one($db, 'SELECT * FROM services WHERE id = :id AND user_id = :userId LIMIT 1', [
        ':id' => $serviceId,
        ':userId' => $user['id'],
    ]);

    if ($service === null) {
        throw new AppError(404, 'Selected service could not be found');
    }

    if ((float) ($service['price'] ?? 0) <= 0) {
        throw new AppError(400, 'Admin has not set the service price yet');
    }

    if (($service['status'] ?? '') === 'rejected') {
        throw new AppError(400, 'This service was rejected by admin. Please review the remarks first');
    }

    if (($service['status'] ?? '') === 'completed') {
        throw new AppError(400, 'This service is already completed');
    }

    if (!in_array((string) ($service['status'] ?? ''), ['approved', 'in progress'], true)) {
        throw new AppError(400, 'Payment will open after admin approves this service');
    }

    $documents = fetch_all(
        $db,
        'SELECT status FROM documents WHERE user_id = :userId AND service_type = :serviceType ORDER BY created_at DESC',
        [':userId' => $user['id'], ':serviceType' => $service['type']],
    );

    if ($documents === []) {
        throw new AppError(400, 'Please upload documents for this service before making payment');
    }

    $approvedDocumentCount = 0;

    foreach ($documents as $document) {
        if (($document['status'] ?? '') === 'rejected') {
            throw new AppError(400, 'Some documents were rejected. Please re-upload and wait for admin review');
        }

        if (($document['status'] ?? '') === 'approved') {
            $approvedDocumentCount++;
        }
    }

    if ($approvedDocumentCount === 0) {
        throw new AppError(400, 'Payment will open after admin approves your documents');
    }

    $existing = fetch_one(
        $db,
        "SELECT * FROM payments
         WHERE user_id = :userId
           AND ((service_id = :serviceId) OR (service_id IS NULL AND service_type = :serviceType))
           AND (verification_status IN ('pending', 'verified') OR status = 'paid')
         ORDER BY created_at DESC
         LIMIT 1",
        [':userId' => $user['id'], ':serviceId' => $serviceId, ':serviceType' => $service['type']],
    );

    if ($existing !== null) {
        $isRepayableOnlinePayment =
            ($paymentMethod === 'online')
            && (($existing['payment_method'] ?? '') === 'online')
            && (($existing['status'] ?? '') === 'pending')
            && (($existing['verification_status'] ?? '') === 'pending')
            && (($existing['razorpay_payment_id'] ?? '') === '');

        if ($isRepayableOnlinePayment) {
            $order = create_razorpay_order((float) $service['price'], (string) $existing['invoice_number']);
            $checkout = ['enabled' => false];

            if (is_array($order) && !empty($order['id'])) {
                update_row($db, 'payments', [
                    'description' => $description !== '' ? $description : (string) ($existing['description'] ?? ''),
                    'amount' => (float) $service['price'],
                    'razorpay_order_id' => $order['id'],
                    'updated_at' => now_db(),
                ], 'id = :id', [':id' => $existing['id']]);

                create_payment_event($db, [
                    'paymentId' => $existing['id'],
                    'userId' => $user['id'],
                    'eventType' => 'payment.checkout_reopened',
                    'source' => 'user',
                    'message' => 'User reopened online checkout.',
                    'payload' => ['razorpayOrderId' => $order['id']],
                ]);

                $checkout = [
                    'enabled' => true,
                    'key' => env_value('RAZORPAY_KEY_ID'),
                    'orderId' => $order['id'],
                    'amount' => $order['amount'] ?? (int) round((float) $service['price'] * 100),
                    'currency' => $order['currency'] ?? 'INR',
                    'description' => $description !== '' ? $description : ($service['type'] . ' invoice'),
                    'prefill' => [
                        'name' => $user['name'],
                        'email' => $user['email'],
                        'contact' => $user['phone'],
                    ],
                ];
            }

            $payment = fetch_one(
                $db,
                sprintf(
                    'SELECT p.*, %s, %s FROM payments p
                     LEFT JOIN services s ON s.id = p.service_id
                     LEFT JOIN users v ON v.id = p.verified_by_id
                     WHERE p.id = :id LIMIT 1',
                    prefixed_columns('s', 'service__', ['id', 'type', 'price', 'status']),
                    user_join_sql('v', 'verified_by__'),
                ),
                [':id' => $existing['id']],
            );

            json_response([
                'message' => 'Payment checkout reopened',
                'payment' => serialize_payment_record((array) $payment),
                'checkout' => $checkout,
            ]);
            return;
        }

        throw new AppError(400, 'A payment request already exists for this service');
    }

    $screenshotUrl = '';
    $screenshotName = '';
    $screenshotType = 'application/octet-stream';

    if ($screenshot !== null) {
        $storedProof = store_uploaded_file(
            $screenshot,
            build_user_storage_relative_dir((string) $user['id'], (string) $service['type']),
            ['pdf', 'png', 'jpg', 'jpeg'],
            ['application/pdf', 'image/png', 'image/jpeg'],
        );
        $screenshotUrl = $storedProof['fileUrl'];
        $screenshotName = $storedProof['originalName'];
        $screenshotType = $storedProof['mimeType'];
    }

    $paymentId = uuid_v4();
    $now = now_db();
    $invoiceNumber = build_invoice_number();

    insert_row($db, 'payments', [
        'id' => $paymentId,
        'user_id' => $user['id'],
        'service_id' => $service['id'],
        'invoice_number' => $invoiceNumber,
        'service_type' => $service['type'],
        'description' => $description,
        'amount' => (float) $service['price'],
        'payment_method' => $paymentMethod,
        'currency' => 'INR',
        'status' => 'pending',
        'verification_status' => 'pending',
        'transaction_id' => $transactionId,
        'razorpay_order_id' => '',
        'razorpay_payment_id' => '',
        'paid_at' => null,
        'screenshot_url' => $screenshotUrl,
        'screenshot_name' => $screenshotName,
        'screenshot_type' => $screenshotType,
        'review_remarks' => '',
        'verified_by_id' => null,
        'verified_at' => null,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    create_payment_event($db, [
        'paymentId' => $paymentId,
        'userId' => $user['id'],
        'eventType' => 'payment.created',
        'source' => 'user',
        'message' => $paymentMethod === 'manual' ? 'Manual payment proof submitted.' : 'Online payment invoice created.',
        'payload' => [
            'serviceId' => $service['id'],
            'serviceType' => $service['type'],
            'paymentMethod' => $paymentMethod,
            'amount' => (float) $service['price'],
        ],
    ]);

    $checkout = ['enabled' => false];
    $order = $paymentMethod === 'online' ? create_razorpay_order((float) $service['price'], $invoiceNumber) : null;

    if (is_array($order) && !empty($order['id'])) {
        update_row($db, 'payments', [
            'razorpay_order_id' => $order['id'],
            'updated_at' => now_db(),
        ], 'id = :id', [':id' => $paymentId]);

        create_payment_event($db, [
            'paymentId' => $paymentId,
            'userId' => $user['id'],
            'eventType' => 'payment.checkout_order_created',
            'source' => 'system',
            'message' => 'Razorpay checkout order created.',
            'payload' => ['razorpayOrderId' => $order['id']],
        ]);

        $checkout = [
            'enabled' => true,
            'key' => env_value('RAZORPAY_KEY_ID'),
            'orderId' => $order['id'],
            'amount' => $order['amount'] ?? (int) round((float) $service['price'] * 100),
            'currency' => $order['currency'] ?? 'INR',
            'description' => $description !== '' ? $description : ($service['type'] . ' invoice'),
            'prefill' => [
                'name' => $user['name'],
                'email' => $user['email'],
                'contact' => $user['phone'],
            ],
        ];
    }

    create_notification($db, [
        'userId' => $user['id'],
        'title' => 'Invoice generated',
        'message' => $paymentMethod === 'manual'
            ? $invoiceNumber . ' has been submitted for manual payment verification.'
            : $invoiceNumber . ' has been created for ' . $service['type'] . '.',
        'category' => 'payment',
        'link' => '/dashboard/payments',
        'actionLabel' => 'Open payments',
    ]);

    $payment = fetch_one(
        $db,
        sprintf(
            'SELECT p.*, %s, %s FROM payments p
             LEFT JOIN services s ON s.id = p.service_id
             LEFT JOIN users v ON v.id = p.verified_by_id
             WHERE p.id = :id LIMIT 1',
            prefixed_columns('s', 'service__', ['id', 'type', 'price', 'status']),
            user_join_sql('v', 'verified_by__'),
        ),
        [':id' => $paymentId],
    );

    json_response([
        'message' => 'Payment request created successfully',
        'payment' => serialize_payment_record((array) $payment),
        'checkout' => $checkout,
    ], 201);
}

function handle_verify_payment(PDO $db): void
{
    $user = current_user($db);
    $data = request_data();
    $paymentRecordId = safe_trim($data['paymentRecordId'] ?? '');
    $razorpayOrderId = safe_trim($data['razorpay_order_id'] ?? '');
    $razorpayPaymentId = safe_trim($data['razorpay_payment_id'] ?? '');
    $razorpaySignature = safe_trim($data['razorpay_signature'] ?? '');
    $secret = env_value('RAZORPAY_KEY_SECRET');

    if ($secret === null) {
        throw new AppError(400, 'Razorpay is not configured');
    }

    $payment = fetch_one($db, 'SELECT * FROM payments WHERE id = :id LIMIT 1', [':id' => $paymentRecordId]);

    if ($payment === null) {
        throw new AppError(404, 'Payment record not found');
    }

    if ((string) $payment['user_id'] !== (string) $user['id']) {
        throw new AppError(403, 'You do not have access to this payment');
    }

    $expected = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, $secret);

    if (!hash_equals($expected, $razorpaySignature)) {
        throw new AppError(400, 'Invalid payment signature');
    }

    update_row($db, 'payments', [
        'status' => 'paid',
        'verification_status' => 'verified',
        'transaction_id' => $razorpayPaymentId,
        'razorpay_order_id' => $razorpayOrderId,
        'razorpay_payment_id' => $razorpayPaymentId,
        'paid_at' => now_db(),
        'verified_at' => now_db(),
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $paymentRecordId]);

    create_payment_event($db, [
        'paymentId' => $paymentRecordId,
        'userId' => $user['id'],
        'eventType' => 'payment.verified',
        'source' => 'razorpay_checkout',
        'message' => 'Online payment signature verified from checkout.',
        'payload' => [
            'razorpayOrderId' => $razorpayOrderId,
            'razorpayPaymentId' => $razorpayPaymentId,
        ],
    ]);

    $moved = mark_service_in_progress_after_payment($db, $payment['service_id'] ?? null);

    create_notification($db, [
        'userId' => $user['id'],
        'title' => 'Payment received',
        'message' => $moved
            ? $payment['invoice_number'] . ' has been marked as paid. ' . $payment['service_type'] . ' is now in progress.'
            : $payment['invoice_number'] . ' has been marked as paid.',
        'category' => 'payment',
        'link' => '/dashboard/payments',
        'actionLabel' => 'Open payments',
    ]);

    $freshPayment = fetch_one($db, 'SELECT * FROM payments WHERE id = :id LIMIT 1', [':id' => $paymentRecordId]);

    if ($freshPayment !== null) {
        send_payment_whatsapp_message($db, (array) $freshPayment, $user);
    }

    json_response([
        'message' => 'Payment verified successfully',
        'payment' => serialize_payment_record((array) $freshPayment),
    ]);
}

function handle_razorpay_webhook(PDO $db): void
{
    $secret = env_value('RAZORPAY_WEBHOOK_SECRET');

    if ($secret === null || trim((string) $secret) === '') {
        throw new AppError(400, 'Razorpay webhook secret is not configured');
    }

    $rawBody = file_get_contents('php://input');
    $signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

    if ($rawBody === false || $rawBody === '' || $signature === '') {
        throw new AppError(400, 'Invalid webhook request');
    }

    $expected = hash_hmac('sha256', $rawBody, (string) $secret);

    if (!hash_equals($expected, (string) $signature)) {
        throw new AppError(400, 'Invalid webhook signature');
    }

    $event = json_decode($rawBody, true);

    if (!is_array($event)) {
        throw new AppError(400, 'Invalid webhook payload');
    }

    $eventType = (string) ($event['event'] ?? 'razorpay.unknown');
    $paymentEntity = $event['payload']['payment']['entity'] ?? [];

    if (!is_array($paymentEntity)) {
        $paymentEntity = [];
    }

    $razorpayOrderId = (string) ($paymentEntity['order_id'] ?? '');
    $razorpayPaymentId = (string) ($paymentEntity['id'] ?? '');
    $razorpayStatus = (string) ($paymentEntity['status'] ?? '');
    $payment = $razorpayOrderId !== ''
        ? fetch_one($db, 'SELECT * FROM payments WHERE razorpay_order_id = :orderId LIMIT 1', [':orderId' => $razorpayOrderId])
        : null;

    create_payment_event($db, [
        'paymentId' => $payment['id'] ?? null,
        'userId' => $payment['user_id'] ?? null,
        'eventType' => $eventType,
        'source' => 'razorpay_webhook',
        'message' => $payment === null ? 'Razorpay webhook received without matching payment.' : 'Razorpay webhook received.',
        'payload' => [
            'orderId' => $razorpayOrderId,
            'paymentId' => $razorpayPaymentId,
            'status' => $razorpayStatus,
        ],
    ]);

    if ($payment === null) {
        json_response(['message' => 'Webhook received']);
        return;
    }

    if ($eventType === 'payment.captured' || $razorpayStatus === 'captured') {
        update_row($db, 'payments', [
            'status' => 'paid',
            'verification_status' => 'verified',
            'transaction_id' => $razorpayPaymentId,
            'razorpay_payment_id' => $razorpayPaymentId,
            'paid_at' => now_db(),
            'verified_at' => now_db(),
            'updated_at' => now_db(),
        ], 'id = :id', [':id' => $payment['id']]);

        $moved = mark_service_in_progress_after_payment($db, $payment['service_id'] ?? null);

        create_notification($db, [
            'userId' => $payment['user_id'],
            'title' => 'Payment received',
            'message' => $moved
                ? $payment['invoice_number'] . ' has been marked as paid. ' . $payment['service_type'] . ' is now in progress.'
                : $payment['invoice_number'] . ' has been marked as paid.',
            'category' => 'payment',
            'link' => '/dashboard/payments',
            'actionLabel' => 'Open payments',
        ]);

        $freshPayment = fetch_one($db, 'SELECT * FROM payments WHERE id = :id LIMIT 1', [':id' => $payment['id']]);
        $paymentUser = fetch_one($db, 'SELECT * FROM users WHERE id = :id LIMIT 1', [':id' => $payment['user_id']]);

        if ($freshPayment !== null && $paymentUser !== null) {
            send_payment_whatsapp_message($db, (array) $freshPayment, (array) $paymentUser);
        }
    }

    if ($eventType === 'payment.failed' || $razorpayStatus === 'failed') {
        $reason = safe_trim($paymentEntity['error_description'] ?? 'Online payment failed.');

        update_row($db, 'payments', [
            'status' => 'rejected',
            'verification_status' => 'rejected',
            'transaction_id' => $razorpayPaymentId,
            'razorpay_payment_id' => $razorpayPaymentId,
            'review_remarks' => $reason,
            'verified_at' => now_db(),
            'updated_at' => now_db(),
        ], 'id = :id', [':id' => $payment['id']]);

        create_notification($db, [
            'userId' => $payment['user_id'],
            'title' => 'Payment failed',
            'message' => $payment['invoice_number'] . ' could not be completed. Please try payment again.',
            'category' => 'payment',
            'link' => '/dashboard/payments',
            'actionLabel' => 'Retry payment',
        ]);
    }

    json_response(['message' => 'Webhook received']);
}

function handle_get_notifications(PDO $db): void
{
    $user = current_user($db);
    $notifications = fetch_all(
        $db,
        'SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC',
        [':userId' => $user['id']],
    );

    json_response(['notifications' => array_map('serialize_notification_record', $notifications)]);
}

function handle_mark_notification_as_read(PDO $db, string $notificationId): void
{
    $user = current_user($db);
    $notification = fetch_one(
        $db,
        'SELECT * FROM notifications WHERE id = :id AND user_id = :userId LIMIT 1',
        [':id' => $notificationId, ':userId' => $user['id']],
    );

    if ($notification === null) {
        throw new AppError(404, 'Notification not found');
    }

    update_row($db, 'notifications', [
        'is_read' => 1,
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $notificationId]);

    $updated = fetch_one($db, 'SELECT * FROM notifications WHERE id = :id LIMIT 1', [':id' => $notificationId]);

    json_response([
        'message' => 'Notification marked as read',
        'notification' => serialize_notification_record((array) $updated),
    ]);
}

function handle_mark_all_notifications_as_read(PDO $db): void
{
    $user = current_user($db);
    execute_statement(
        $db,
        'UPDATE notifications SET is_read = 1, updated_at = :updatedAt WHERE user_id = :userId AND is_read = 0',
        [':updatedAt' => now_db(), ':userId' => $user['id']],
    );

    json_response(['message' => 'Notifications marked as read']);
}
