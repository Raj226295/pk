<?php
declare(strict_types=1);

function find_accessible_document(PDO $db, string $documentId, array $requester, bool $adminAccess): array
{
    $document = fetch_one(
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

    if ($document === null) {
        throw new AppError(404, 'Document not found');
    }

    if (!$adminAccess && (string) $document['user_id'] !== (string) $requester['id']) {
        throw new AppError(403, 'You do not have access to this document');
    }

    return $document;
}

function mark_service_in_progress_after_payment(PDO $db, ?string $serviceId): bool
{
    if ($serviceId === null || $serviceId === '') {
        return false;
    }

    $service = fetch_one($db, 'SELECT * FROM services WHERE id = :id LIMIT 1', [':id' => $serviceId]);

    if ($service === null) {
        return false;
    }

    $currentStatus = strtolower((string) ($service['status'] ?? 'pending'));

    if (in_array($currentStatus, ['rejected', 'completed', 'in progress'], true)) {
        return false;
    }

    update_row($db, 'services', [
        'status' => 'in progress',
        'completed_at' => null,
        'updated_at' => now_db(),
    ], 'id = :id', [':id' => $serviceId]);

    return true;
}

function create_payment_event(PDO $db, array $payload): void
{
    try {
        $details = $payload['payload'] ?? null;

        insert_row($db, 'payment_events', [
            'id' => uuid_v4(),
            'payment_id' => $payload['paymentId'] ?? null,
            'user_id' => $payload['userId'] ?? null,
            'event_type' => $payload['eventType'] ?? 'payment.event',
            'source' => $payload['source'] ?? 'system',
            'message' => $payload['message'] ?? '',
            'payload' => $details === null ? null : json_encode($details, JSON_UNESCAPED_SLASHES),
            'created_at' => now_db(),
        ]);
    } catch (Throwable $error) {
        error_log('Payment event logging failed: ' . $error->getMessage());
    }
}

function build_public_app_url(string $path = ''): string
{
    $baseUrl = rtrim((string) env_value('APP_PUBLIC_URL', env_value('FRONTEND_URL', 'https://www.pkbusinesssolution.in')), '/');
    return $baseUrl . '/' . ltrim($path, '/');
}

function format_whatsapp_amount(mixed $amount): string
{
    $value = (float) ($amount ?? 0);
    return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
}

function format_whatsapp_date(?string $value): string
{
    if ($value === null || $value === '') {
        return date('d-m-Y');
    }

    try {
        $date = new DateTimeImmutable($value, new DateTimeZone(env_value('APP_TIMEZONE', 'Asia/Kolkata')));
        return $date->format('d-m-Y');
    } catch (Throwable) {
        return date('d-m-Y');
    }
}

function normalize_whatsapp_recipient_phone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';

    if (strlen($digits) === 10) {
        return '91' . $digits;
    }

    if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
        return $digits;
    }

    return $digits !== '' ? $digits : trim($phone);
}

function billfree_response_is_success(mixed $response): bool
{
    if (!is_string($response) || trim($response) === '') {
        return false;
    }

    $decoded = json_decode($response, true);

    if (!is_array($decoded)) {
        return true;
    }

    return ($decoded['error'] ?? false) === false;
}

function send_payment_whatsapp_message(PDO $db, array $payment, array $user): void
{
    $paymentId = (string) ($payment['id'] ?? '');
    $userId = (string) ($payment['user_id'] ?? $user['id'] ?? '');

    if ($paymentId === '' || $userId === '') {
        return;
    }

    $alreadySent = fetch_one(
        $db,
        "SELECT id FROM payment_events WHERE payment_id = :paymentId AND event_type = 'payment.whatsapp_sent' LIMIT 1",
        [':paymentId' => $paymentId],
    );

    if ($alreadySent !== null) {
        return;
    }

    $phone = normalize_whatsapp_recipient_phone(safe_trim($user['phone'] ?? ''));
    if ($phone === '') {
        create_payment_event($db, [
            'paymentId' => $paymentId,
            'userId' => $userId,
            'eventType' => 'payment.whatsapp_skipped',
            'source' => 'billfree',
            'message' => 'Payment WhatsApp message skipped because user phone is missing.',
        ]);
        return;
    }

    $dashboardPaymentsUrl = build_public_app_url('/dashboard/payments');
    $payload = json_encode([
        'phone'       => $phone,
        'auth_token'  => env_value('BILLFREE_AUTH_TOKEN', 'de955238e3dba02bd8137e535adc70de'),
        'template_id' => env_value('BILLFREE_PAYMENT_TEMPLATE_ID', 'ca99b53d-d2cc-4bfd-9932-1e3c32b0b515'),
        'header_vars' => [],
        'body_vars'   => [
            1 => (string) ($payment['service_type'] ?? 'Service'),
            2 => format_whatsapp_amount($payment['amount'] ?? 0),
            3 => (string) ($payment['invoice_number'] ?? ''),
            4 => format_whatsapp_date($payment['paid_at'] ?? $payment['verified_at'] ?? $payment['updated_at'] ?? null),
            5 => env_value('BILLFREE_SUPPORT_PHONE', '7015691842'),
        ],
        'button_vars' => [
            1 => $dashboardPaymentsUrl,
            2 => $dashboardPaymentsUrl,
        ],
        'file'        => [
            'type' => 'image',
            'link' => env_value('BILLFREE_PAYMENT_IMAGE_URL', 'https://www.pkbusinesssolution.in/assets/home-hero-profile-wiazK9b7.jpg'),
        ],
    ], JSON_UNESCAPED_SLASHES);

    if ($payload === false || !function_exists('curl_init')) {
        create_payment_event($db, [
            'paymentId' => $paymentId,
            'userId' => $userId,
            'eventType' => 'payment.whatsapp_failed',
            'source' => 'billfree',
            'message' => 'Payment WhatsApp message could not be prepared.',
        ]);
        return;
    }

    $curl = curl_init('https://billfree.in/m-api/send-whatsapp');
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 10,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload),
        ],
    ]);

    $response = curl_exec($curl);
    $httpCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($curlError !== '' || $httpCode !== 200 || !billfree_response_is_success($response)) {
        create_payment_event($db, [
            'paymentId' => $paymentId,
            'userId' => $userId,
            'eventType' => 'payment.whatsapp_failed',
            'source' => 'billfree',
            'message' => 'Payment WhatsApp message failed to send.',
            'payload' => [
                'httpCode' => $httpCode,
                'curlError' => $curlError,
                'response' => is_string($response) ? substr($response, 0, 500) : '',
            ],
        ]);
        return;
    }

    create_payment_event($db, [
        'paymentId' => $paymentId,
        'userId' => $userId,
        'eventType' => 'payment.whatsapp_sent',
        'source' => 'billfree',
        'message' => 'Payment WhatsApp message sent successfully.',
        'payload' => [
            'phone' => $phone,
            'templateId' => env_value('BILLFREE_PAYMENT_TEMPLATE_ID', 'ca99b53d-d2cc-4bfd-9932-1e3c32b0b515'),
            'response' => is_string($response) ? substr($response, 0, 500) : '',
        ],
    ]);
}

function send_service_completion_whatsapp_message(PDO $db, array $service, array $user): void
{
    $serviceId = (string) ($service['id'] ?? '');
    $userId = (string) ($service['user_id'] ?? $user['id'] ?? '');

    if ($serviceId === '' || $userId === '') {
        return;
    }

    $alreadySent = fetch_one(
        $db,
        "SELECT id FROM payment_events
         WHERE user_id = :userId
           AND event_type = 'service.whatsapp_sent'
           AND payload LIKE :serviceId
           AND payload LIKE :phone
         LIMIT 1",
        [
            ':userId' => $userId,
            ':serviceId' => '%"serviceId":"' . $serviceId . '"%',
            ':phone' => '%"phone":"' . normalize_whatsapp_recipient_phone(safe_trim($user['phone'] ?? '')) . '"%',
        ],
    );

    if ($alreadySent !== null) {
        return;
    }

    $phone = normalize_whatsapp_recipient_phone(safe_trim($user['phone'] ?? ''));
    if ($phone === '') {
        create_payment_event($db, [
            'paymentId' => null,
            'userId' => $userId,
            'eventType' => 'service.whatsapp_skipped',
            'source' => 'billfree',
            'message' => 'Service WhatsApp message skipped because user phone is missing.',
            'payload' => ['serviceId' => $serviceId],
        ]);
        return;
    }

    $payload = json_encode([
        'phone'       => $phone,
        'auth_token'  => env_value('BILLFREE_AUTH_TOKEN', 'de955238e3dba02bd8137e535adc70de'),
        'template_id' => env_value('BILLFREE_SERVICE_TEMPLATE_ID', '52bd4930-2876-4bbc-bd23-e9e6b99568be'),
        'header_vars' => [],
        'body_vars'   => [
            1 => (string) ($user['name'] ?? 'Customer'),
            2 => (string) ($service['type'] ?? 'Service'),
            3 => format_whatsapp_date($service['completed_at'] ?? $service['updated_at'] ?? null),
        ],
        'button_vars' => [],
        'file'        => [
            'type' => 'image',
            'link' => env_value('BILLFREE_SERVICE_IMAGE_URL', 'https://www.pkbusinesssolution.in/assets/home-hero-profile-wiazK9b7.jpg'),
        ],
    ], JSON_UNESCAPED_SLASHES);

    if ($payload === false || !function_exists('curl_init')) {
        create_payment_event($db, [
            'paymentId' => null,
            'userId' => $userId,
            'eventType' => 'service.whatsapp_failed',
            'source' => 'billfree',
            'message' => 'Service WhatsApp message could not be prepared.',
            'payload' => ['serviceId' => $serviceId],
        ]);
        return;
    }

    $curl = curl_init('https://billfree.in/m-api/send-whatsapp');
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 10,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload),
        ],
    ]);

    $response = curl_exec($curl);
    $httpCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($curlError !== '' || $httpCode !== 200 || !billfree_response_is_success($response)) {
        create_payment_event($db, [
            'paymentId' => null,
            'userId' => $userId,
            'eventType' => 'service.whatsapp_failed',
            'source' => 'billfree',
            'message' => 'Service WhatsApp message failed to send.',
            'payload' => [
                'serviceId' => $serviceId,
                'httpCode' => $httpCode,
                'curlError' => $curlError,
                'response' => is_string($response) ? substr($response, 0, 500) : '',
            ],
        ]);
        return;
    }

    create_payment_event($db, [
        'paymentId' => null,
        'userId' => $userId,
        'eventType' => 'service.whatsapp_sent',
        'source' => 'billfree',
        'message' => 'Service WhatsApp message sent successfully.',
        'payload' => [
            'serviceId' => $serviceId,
            'phone' => $phone,
            'templateId' => env_value('BILLFREE_SERVICE_TEMPLATE_ID', '52bd4930-2876-4bbc-bd23-e9e6b99568be'),
            'response' => is_string($response) ? substr($response, 0, 500) : '',
        ],
    ]);
}

function format_whatsapp_time(?string $value): string
{
    if ($value === null || $value === '') {
        return date('h:i A');
    }

    try {
        $date = new DateTimeImmutable($value, new DateTimeZone(env_value('APP_TIMEZONE', 'Asia/Kolkata')));
        return $date->format('h:i A');
    } catch (Throwable) {
        return date('h:i A');
    }
}

function send_appointment_whatsapp_message(PDO $db, array $appointment, array $user): void
{
    $appointmentId = (string) ($appointment['id'] ?? '');
    $userId = (string) ($appointment['user_id'] ?? $user['id'] ?? '');

    if ($appointmentId === '' || $userId === '') {
        return;
    }

    $phone = normalize_whatsapp_recipient_phone(safe_trim($user['phone'] ?? ''));
    $alreadySent = fetch_one(
        $db,
        "SELECT id FROM payment_events
         WHERE user_id = :userId
           AND event_type = 'appointment.whatsapp_sent'
           AND payload LIKE :appointmentId
           AND payload LIKE :phone
         LIMIT 1",
        [
            ':userId' => $userId,
            ':appointmentId' => '%"appointmentId":"' . $appointmentId . '"%',
            ':phone' => '%"phone":"' . $phone . '"%',
        ],
    );

    if ($alreadySent !== null) {
        return;
    }

    if ($phone === '') {
        create_payment_event($db, [
            'paymentId' => null,
            'userId' => $userId,
            'eventType' => 'appointment.whatsapp_skipped',
            'source' => 'billfree',
            'message' => 'Appointment WhatsApp message skipped because user phone is missing.',
            'payload' => ['appointmentId' => $appointmentId],
        ]);
        return;
    }

    $payload = json_encode([
        'phone'       => $phone,
        'auth_token'  => env_value('BILLFREE_AUTH_TOKEN', 'de955238e3dba02bd8137e535adc70de'),
        'template_id' => env_value('BILLFREE_APPOINTMENT_TEMPLATE_ID', '003e953f-fbfd-4620-addd-987a003f6961'),
        'header_vars' => [],
        'body_vars'   => [
            1 => (string) ($user['name'] ?? 'Customer'),
            2 => format_whatsapp_date($appointment['scheduled_for'] ?? null),
            3 => format_whatsapp_time($appointment['scheduled_for'] ?? null),
            4 => (string) ($appointment['service_type'] ?? 'General consultation'),
        ],
        'button_vars' => [],
        'file'        => [
            'type' => 'image',
            'link' => env_value('BILLFREE_APPOINTMENT_IMAGE_URL', 'https://www.pkbusinesssolution.in/assets/home-hero-profile-wiazK9b7.jpg'),
        ],
    ], JSON_UNESCAPED_SLASHES);

    if ($payload === false || !function_exists('curl_init')) {
        create_payment_event($db, [
            'paymentId' => null,
            'userId' => $userId,
            'eventType' => 'appointment.whatsapp_failed',
            'source' => 'billfree',
            'message' => 'Appointment WhatsApp message could not be prepared.',
            'payload' => ['appointmentId' => $appointmentId],
        ]);
        return;
    }

    $curl = curl_init('https://billfree.in/m-api/send-whatsapp');
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 10,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload),
        ],
    ]);

    $response = curl_exec($curl);
    $httpCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($curlError !== '' || $httpCode !== 200 || !billfree_response_is_success($response)) {
        create_payment_event($db, [
            'paymentId' => null,
            'userId' => $userId,
            'eventType' => 'appointment.whatsapp_failed',
            'source' => 'billfree',
            'message' => 'Appointment WhatsApp message failed to send.',
            'payload' => [
                'appointmentId' => $appointmentId,
                'httpCode' => $httpCode,
                'curlError' => $curlError,
                'response' => is_string($response) ? substr($response, 0, 500) : '',
            ],
        ]);
        return;
    }

    create_payment_event($db, [
        'paymentId' => null,
        'userId' => $userId,
        'eventType' => 'appointment.whatsapp_sent',
        'source' => 'billfree',
        'message' => 'Appointment WhatsApp message sent successfully.',
        'payload' => [
            'appointmentId' => $appointmentId,
            'phone' => $phone,
            'templateId' => env_value('BILLFREE_APPOINTMENT_TEMPLATE_ID', '003e953f-fbfd-4620-addd-987a003f6961'),
            'request' => $payload,
            'response' => is_string($response) ? substr($response, 0, 500) : '',
        ],
    ]);
}

function payment_is_receiptable(array $payment): bool
{
    return ($payment['status'] ?? '') === 'paid' || ($payment['verification_status'] ?? '') === 'verified';
}

function render_payment_receipt_html(array $payment): string
{
    $user = extract_prefixed_row($payment, 'user__');
    $clientName = $user['name'] ?? 'Client';
    $clientEmail = $user['email'] ?? '';
    $clientPhone = $user['phone'] ?? '';
    $paidAt = format_datetime_label($payment['paid_at'] ?? $payment['verified_at'] ?? $payment['updated_at'] ?? null);
    $amount = number_format((float) ($payment['amount'] ?? 0), 2);

    $escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');

    return '<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ' . $escape($payment['invoice_number'] ?? '') . '</title>
  <style>
    body { color: #1f2933; font-family: Arial, sans-serif; margin: 0; padding: 32px; }
    .receipt { border: 1px solid #d7e2e4; margin: 0 auto; max-width: 760px; padding: 32px; }
    .top { align-items: flex-start; display: flex; justify-content: space-between; gap: 24px; }
    h1 { font-size: 26px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    p { color: #50606a; line-height: 1.5; margin: 4px 0; }
    table { border-collapse: collapse; margin-top: 20px; width: 100%; }
    th, td { border-bottom: 1px solid #e3ecee; padding: 12px 0; text-align: left; }
    th { color: #50606a; font-size: 12px; text-transform: uppercase; }
    .amount { color: #0d6b5d; font-size: 24px; font-weight: 700; text-align: right; }
    .print { margin: 0 auto 16px; max-width: 760px; text-align: right; }
    button { background: #0d6b5d; border: 0; border-radius: 6px; color: #fff; cursor: pointer; padding: 10px 16px; }
    @media print { body { padding: 0; } .print { display: none; } .receipt { border: 0; max-width: none; } }
  </style>
</head>
<body>
  <div class="print"><button onclick="window.print()">Print / Save PDF</button></div>
  <main class="receipt">
    <div class="top">
      <div>
        <h1>P.K Business Solution</h1>
        <p>Payment receipt</p>
      </div>
      <div>
        <p><strong>Invoice:</strong> ' . $escape($payment['invoice_number'] ?? '') . '</p>
        <p><strong>Date:</strong> ' . $escape($paidAt) . '</p>
      </div>
    </div>
    <h2>Client</h2>
    <p>' . $escape($clientName) . '</p>
    <p>' . $escape(trim($clientEmail . ' ' . $clientPhone)) . '</p>
    <table>
      <thead><tr><th>Service</th><th>Method</th><th>Transaction</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>' . $escape($payment['service_type'] ?? '') . '</td>
          <td>' . $escape(($payment['payment_method'] ?? 'online') === 'manual' ? 'Manual / UPI' : 'Online checkout') . '</td>
          <td>' . $escape(($payment['transaction_id'] ?? '') !== '' ? $payment['transaction_id'] : ($payment['razorpay_payment_id'] ?? '')) . '</td>
          <td class="amount">INR ' . $escape($amount) . '</td>
        </tr>
      </tbody>
    </table>
    <p>This receipt was generated after payment verification.</p>
  </main>
</body>
</html>';
}

function send_payment_receipt(array $payment): void
{
    if (!payment_is_receiptable($payment)) {
        throw new AppError(400, 'Receipt is available only after payment is verified');
    }

    $filename = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) ($payment['invoice_number'] ?? 'receipt'));
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: inline; filename="' . $filename . '.html"');
    echo render_payment_receipt_html($payment);
}

function derive_appointment_service_type(array $appointment, array $services, array $documents, array $payments): string
{
    if (!empty($appointment['service_type'])) {
        return $appointment['service_type'];
    }

    foreach ($services as $service) {
        if (!empty($service['type'])) {
            return $service['type'];
        }
    }

    foreach ($documents as $document) {
        if (!empty($document['service_type'])) {
            return $document['service_type'];
        }
    }

    foreach ($payments as $payment) {
        if (!empty($payment['service_type'])) {
            return $payment['service_type'];
        }
    }

    return 'General consultation';
}

function pick_latest_record_by_service(array $records, string $serviceType, string $field): ?array
{
    foreach ($records as $record) {
        if (($record[$field] ?? '') === $serviceType) {
            return $record;
        }
    }

    return $records[0] ?? null;
}

function build_user_summary_maps(PDO $db): array
{
    $documentRows = fetch_all(
        $db,
        "SELECT user_id, COUNT(*) AS total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
         FROM documents GROUP BY user_id",
    );
    $serviceRows = fetch_all(
        $db,
        "SELECT user_id, COUNT(*) AS total,
                SUM(CASE WHEN status NOT IN ('rejected', 'completed') THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
         FROM services GROUP BY user_id",
    );
    $paymentRows = fetch_all(
        $db,
        "SELECT user_id, COUNT(*) AS total,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid,
                SUM(CASE WHEN status = 'pending' OR verification_status = 'pending' THEN 1 ELSE 0 END) AS pending
         FROM payments GROUP BY user_id",
    );
    $appointmentRows = fetch_all(
        $db,
        "SELECT user_id, COUNT(*) AS total,
                SUM(CASE WHEN status IN ('pending', 'approved', 'rescheduled') THEN 1 ELSE 0 END) AS pending
         FROM appointments GROUP BY user_id",
    );

    $maps = [
        'documentMap' => [],
        'serviceMap' => [],
        'paymentMap' => [],
        'appointmentMap' => [],
    ];

    foreach ($documentRows as $row) {
        $maps['documentMap'][(string) $row['user_id']] = [
            'total' => (int) $row['total'],
            'pending' => (int) $row['pending'],
        ];
    }

    foreach ($serviceRows as $row) {
        $maps['serviceMap'][(string) $row['user_id']] = [
            'total' => (int) $row['total'],
            'active' => (int) $row['active'],
            'completed' => (int) $row['completed'],
        ];
    }

    foreach ($paymentRows as $row) {
        $maps['paymentMap'][(string) $row['user_id']] = [
            'total' => (int) $row['total'],
            'paid' => (float) $row['paid'],
            'pending' => (int) $row['pending'],
        ];
    }

    foreach ($appointmentRows as $row) {
        $maps['appointmentMap'][(string) $row['user_id']] = [
            'total' => (int) $row['total'],
            'pending' => (int) $row['pending'],
        ];
    }

    return $maps;
}
