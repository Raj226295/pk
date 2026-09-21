<?php
declare(strict_types=1);

function user_join_sql(string $alias, string $prefix): string
{
    return prefixed_columns($alias, $prefix, [
        'id',
        'name',
        'email',
        'phone',
        'company_name',
        'profile_image',
        'profile_image_zoom',
        'profile_image_offset_x',
        'profile_image_offset_y',
        'is_blocked',
        'blocked_at',
        'role',
        'created_at',
        'updated_at',
    ]);
}

function catalog_join_sql(string $alias, string $prefix): string
{
    return prefixed_columns($alias, $prefix, [
        'id',
        'name',
        'description',
        'price',
        'is_active',
        'image',
        'image_zoom',
        'image_offset_x',
        'image_offset_y',
        'sort_order',
        'created_at',
        'updated_at',
    ]);
}

function serialize_user_record(array $user): array
{
    return [
        '_id' => (string) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'companyName' => $user['company_name'] ?? '',
        'profileImage' => $user['profile_image'] ?? '',
        'profileImageZoom' => (float) ($user['profile_image_zoom'] ?? 1),
        'profileImageOffsetX' => (float) ($user['profile_image_offset_x'] ?? 0),
        'profileImageOffsetY' => (float) ($user['profile_image_offset_y'] ?? 0),
        'isBlocked' => (bool) ($user['is_blocked'] ?? 0),
        'blockedAt' => to_iso8601($user['blocked_at'] ?? null),
        'role' => $user['role'] ?? 'user',
        'createdAt' => to_iso8601($user['created_at'] ?? null),
        'updatedAt' => to_iso8601($user['updated_at'] ?? null),
    ];
}

function serialize_service_catalog_record(array $record): array
{
    return [
        '_id' => (string) $record['id'],
        'name' => $record['name'],
        'description' => $record['description'] ?? '',
        'price' => (float) ($record['price'] ?? 0),
        'isActive' => (bool) ($record['is_active'] ?? 0),
        'image' => $record['image'] ?? '',
        'imageZoom' => (float) ($record['image_zoom'] ?? 1),
        'imageOffsetX' => (float) ($record['image_offset_x'] ?? 0),
        'imageOffsetY' => (float) ($record['image_offset_y'] ?? 0),
        'sortOrder' => (int) ($record['sort_order'] ?? 0),
        'createdAt' => to_iso8601($record['created_at'] ?? null),
        'updatedAt' => to_iso8601($record['updated_at'] ?? null),
    ];
}

function serialize_service_record(array $record): array
{
    return [
        '_id' => (string) $record['id'],
        'user' => ($user = extract_prefixed_row($record, 'user__')) ? serialize_user_record($user) : (isset($record['user_id']) ? ['_id' => (string) $record['user_id']] : null),
        'requestedByClient' => (bool) ($record['requested_by_client'] ?? 0),
        'catalogService' => ($catalog = extract_prefixed_row($record, 'catalog__')) ? serialize_service_catalog_record($catalog) : null,
        'type' => $record['type'],
        'description' => $record['description'] ?? '',
        'price' => (float) ($record['price'] ?? 0),
        'status' => $record['status'] ?? 'pending',
        'priority' => $record['priority'] ?? 'medium',
        'notes' => $record['notes'] ?? '',
        'adminRemarks' => $record['admin_remarks'] ?? '',
        'completedAt' => to_iso8601($record['completed_at'] ?? null),
        'createdAt' => to_iso8601($record['created_at'] ?? null),
        'updatedAt' => to_iso8601($record['updated_at'] ?? null),
    ];
}

function serialize_document_record(array $record, string $role = 'user'): array
{
    $status = ($record['status'] ?? 'pending') === 'verified' ? 'approved' : ($record['status'] ?? 'pending');

    return [
        '_id' => (string) $record['id'],
        'user' => ($user = extract_prefixed_row($record, 'user__')) ? serialize_user_record($user) : (isset($record['user_id']) ? ['_id' => (string) $record['user_id']] : null),
        'uploadedBy' => ($uploadedBy = extract_prefixed_row($record, 'uploaded_by__')) ? serialize_user_record($uploadedBy) : (isset($record['uploaded_by_id']) && $record['uploaded_by_id'] !== null ? ['_id' => (string) $record['uploaded_by_id']] : null),
        'reviewedBy' => ($reviewedBy = extract_prefixed_row($record, 'reviewed_by__')) ? serialize_user_record($reviewedBy) : (isset($record['reviewed_by_id']) && $record['reviewed_by_id'] !== null ? ['_id' => (string) $record['reviewed_by_id']] : null),
        'title' => $record['title'],
        'documentType' => $record['document_type'] ?? '',
        'serviceType' => $record['service_type'] ?? 'General',
        'inputType' => $record['input_type'] ?? 'file',
        'textValue' => $record['text_value'] ?? '',
        'filename' => $record['filename'] ?? '',
        'originalName' => ($record['original_name'] ?? '') !== '' ? $record['original_name'] : ($record['filename'] ?? ''),
        'relativePath' => $record['relative_path'] ?? '',
        'storageFolder' => $record['storage_folder'] ?? '',
        'fileUrl' => $record['file_url'] ?? '',
        'mimeType' => $record['mime_type'] ?? 'application/octet-stream',
        'status' => $status,
        'remarks' => $record['remarks'] ?? '',
        'notes' => $record['notes'] ?? '',
        'reviewedAt' => to_iso8601($record['reviewed_at'] ?? null),
        'createdAt' => to_iso8601($record['created_at'] ?? null),
        'updatedAt' => to_iso8601($record['updated_at'] ?? null),
        'downloadUrl' => ($record['input_type'] ?? 'file') === 'text'
            ? ''
            : ($role === 'admin'
                ? '/api/admin/documents/' . $record['id'] . '/download'
                : '/api/documents/' . $record['id'] . '/download'),
    ];
}

function serialize_payment_record(array $record): array
{
    return [
        '_id' => (string) $record['id'],
        'user' => ($user = extract_prefixed_row($record, 'user__')) ? serialize_user_record($user) : (isset($record['user_id']) ? ['_id' => (string) $record['user_id']] : null),
        'service' => ($service = extract_prefixed_row($record, 'service__')) ? [
            '_id' => (string) $service['id'],
            'type' => $service['type'],
            'price' => (float) ($service['price'] ?? 0),
            'status' => $service['status'] ?? 'pending',
        ] : (isset($record['service_id']) && $record['service_id'] !== null ? ['_id' => (string) $record['service_id']] : null),
        'invoiceNumber' => $record['invoice_number'],
        'serviceType' => $record['service_type'],
        'description' => $record['description'] ?? '',
        'amount' => (float) ($record['amount'] ?? 0),
        'paymentMethod' => $record['payment_method'] ?? 'online',
        'currency' => $record['currency'] ?? 'INR',
        'status' => $record['status'] ?? 'pending',
        'verificationStatus' => $record['verification_status'] ?? 'pending',
        'transactionId' => $record['transaction_id'] ?? '',
        'razorpayOrderId' => $record['razorpay_order_id'] ?? '',
        'razorpayPaymentId' => $record['razorpay_payment_id'] ?? '',
        'paidAt' => to_iso8601($record['paid_at'] ?? null),
        'screenshotUrl' => $record['screenshot_url'] ?? '',
        'screenshotName' => $record['screenshot_name'] ?? '',
        'screenshotType' => $record['screenshot_type'] ?? 'application/octet-stream',
        'reviewRemarks' => $record['review_remarks'] ?? '',
        'verifiedBy' => ($verifiedBy = extract_prefixed_row($record, 'verified_by__')) ? serialize_user_record($verifiedBy) : (isset($record['verified_by_id']) && $record['verified_by_id'] !== null ? ['_id' => (string) $record['verified_by_id']] : null),
        'verifiedAt' => to_iso8601($record['verified_at'] ?? null),
        'createdAt' => to_iso8601($record['created_at'] ?? null),
        'updatedAt' => to_iso8601($record['updated_at'] ?? null),
    ];
}

function serialize_appointment_record(array $record): array
{
    $status = normalize_appointment_status($record['status'] ?? 'pending');

    return [
        '_id' => (string) $record['id'],
        'user' => ($user = extract_prefixed_row($record, 'user__')) ? serialize_user_record($user) : (isset($record['user_id']) ? ['_id' => (string) $record['user_id']] : null),
        'scheduledFor' => to_iso8601($record['scheduled_for'] ?? null),
        'serviceType' => $record['service_type'] !== '' ? $record['service_type'] : 'General consultation',
        'notes' => $record['notes'] ?? '',
        'message' => $record['notes'] ?? '',
        'adminNotes' => $record['admin_notes'] ?? '',
        'rejectionReason' => $record['rejection_reason'] ?? '',
        'status' => $status,
        'statusLabel' => title_case_label($status),
        'createdAt' => to_iso8601($record['created_at'] ?? null),
        'updatedAt' => to_iso8601($record['updated_at'] ?? null),
    ];
}

function serialize_notification_record(array $record): array
{
    return [
        '_id' => (string) $record['id'],
        'user' => ($user = extract_prefixed_row($record, 'user__')) ? serialize_user_record($user) : (isset($record['user_id']) ? ['_id' => (string) $record['user_id']] : null),
        'title' => $record['title'],
        'message' => $record['message'],
        'category' => $record['category'] ?? 'general',
        'link' => $record['link'] ?? '',
        'fileUrl' => $record['file_url'] ?? '',
        'actionLabel' => $record['action_label'] ?? '',
        'read' => (bool) ($record['is_read'] ?? 0),
        'createdAt' => to_iso8601($record['created_at'] ?? null),
        'updatedAt' => to_iso8601($record['updated_at'] ?? null),
    ];
}

function serialize_contact_message_record(array $record): array
{
    return [
        '_id' => (string) $record['id'],
        'name' => $record['name'],
        'email' => $record['email'],
        'phone' => $record['phone'],
        'message' => $record['message'] ?? '',
        'source' => $record['source'] ?? 'contact',
        'pageUrl' => $record['page_url'] ?? '',
        'createdAt' => to_iso8601($record['created_at'] ?? null),
    ];
}

function serialize_blog_record(array $record): array
{
    return [
        '_id' => (string) $record['id'],
        'title' => $record['title'],
        'slug' => $record['slug'],
        'description' => $record['description'],
        'content' => $record['content'],
        'category' => $record['category'],
        'publishedAt' => to_iso8601($record['published_at'] ?? null),
        'createdAt' => to_iso8601($record['created_at'] ?? null),
        'updatedAt' => to_iso8601($record['updated_at'] ?? null),
    ];
}

function create_notification(PDO $db, array $payload): array
{
    $now = now_db();
    $record = [
        'id' => uuid_v4(),
        'user_id' => $payload['userId'],
        'title' => $payload['title'],
        'message' => $payload['message'],
        'category' => $payload['category'] ?? 'general',
        'link' => $payload['link'] ?? '',
        'file_url' => $payload['fileUrl'] ?? '',
        'action_label' => $payload['actionLabel'] ?? '',
        'is_read' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ];

    insert_row($db, 'notifications', $record);
    return serialize_notification_record($record);
}
