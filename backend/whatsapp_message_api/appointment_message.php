<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    $body = [];
}

$value = static function (array $source, array $keys, string $default = ''): string {
    foreach ($keys as $key) {
        if (isset($source[$key]) && trim((string) $source[$key]) !== '') {
            return trim((string) $source[$key]);
        }
    }

    return $default;
};

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

$phone = $value($body, ['phone', 'mobile', 'mobileNumber', 'mobile_number']);
$customerName = $value($body, ['customerName', 'customer_name', 'name']);
$appointmentDate = $value($body, ['appointmentDate', 'appointment_date', 'date']);
$appointmentTime = $value($body, ['appointmentTime', 'appointment_time', 'time']);
$serviceName = $value($body, ['serviceName', 'service_name', 'serviceType', 'service_type']);
$imageLink = $value($body, ['imageLink', 'image_link', 'imageUrl', 'image_url'], 'https://www.pkbusinesssolution.in/assets/home-hero-profile-wiazK9b7.jpg');

if ($phone === '') {
    http_response_code(422);
    echo json_encode(['error' => 'Phone number is required.']);
    exit;
}

$phone = normalize_whatsapp_recipient_phone($phone);

if ($customerName === '' || $appointmentDate === '' || $appointmentTime === '' || $serviceName === '') {
    http_response_code(422);
    echo json_encode([
        'error' => 'Customer name, appointment date, appointment time, and service name are required.',
    ]);
    exit;
}

// Build WhatsApp appointment booking template payload
$payload = json_encode([
    'phone'       => $phone,
    'auth_token'  => 'de955238e3dba02bd8137e535adc70de',
    'template_id' => '003e953f-fbfd-4620-addd-987a003f6961',
    'header_vars' => [],
    'body_vars'   => [
        1 => $customerName,
        2 => $appointmentDate,
        3 => $appointmentTime,
        4 => $serviceName,
    ],
    'button_vars' => [],
    'file'        => [
        'type' => 'image',
        'link' => $imageLink,
    ],
], JSON_UNESCAPED_SLASHES);

// Send to WhatsApp API
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
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curlError = curl_error($curl);
curl_close($curl);

// Return result
if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to connect to WhatsApp API.']);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'WhatsApp API returned an error.', 'code' => $httpCode]);
    exit;
}

http_response_code(200);
echo json_encode(['message' => 'Appointment WhatsApp message sent successfully.']);
