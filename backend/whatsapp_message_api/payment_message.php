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
$serviceName = $value($body, ['serviceName', 'service_name', 'serviceType', 'service_type', 'transactionWith', 'transaction_with']);
$amount = $value($body, ['amount', 'invoiceAmount', 'invoice_amount']);
$invoiceNumber = $value($body, ['invoiceNumber', 'invoice_number', 'invoiceNo', 'invoice_no']);
$invoiceDate = $value($body, ['invoiceDate', 'invoice_date', 'date']);
$supportPhone = $value($body, ['supportPhone', 'support_phone', 'contactPhone', 'contact_phone'], '7015691842');
$invoiceLink = $value($body, ['invoiceLink', 'invoice_link', 'invoiceUrl', 'invoice_url']);
$paymentLink = $value($body, ['paymentLink', 'payment_link', 'paymentUrl', 'payment_url']);
$imageLink = $value($body, ['imageLink', 'image_link', 'imageUrl', 'image_url'], 'https://www.pkbusinesssolution.in/assets/home-hero-profile-wiazK9b7.jpg');

if ($phone === '') {
    http_response_code(422);
    echo json_encode(['error' => 'Phone number is required.']);
    exit;
}

$phone = normalize_whatsapp_recipient_phone($phone);

if ($serviceName === '' || $amount === '' || $invoiceNumber === '' || $invoiceDate === '') {
    http_response_code(422);
    echo json_encode([
        'error' => 'Service name, amount, invoice number, and invoice date are required.',
    ]);
    exit;
}

$buttonVars = [];
if ($invoiceLink !== '') {
    $buttonVars[1] = $invoiceLink;
}
if ($paymentLink !== '') {
    $buttonVars[2] = $paymentLink;
}

// Build WhatsApp payment template payload
$payload = json_encode([
    'phone'       => $phone,
    'auth_token'  => 'de955238e3dba02bd8137e535adc70de',
    'template_id' => 'ca99b53d-d2cc-4bfd-9932-1e3c32b0b515',
    'header_vars' => [],
    'body_vars'   => [
        1 => $serviceName,
        2 => $amount,
        3 => $invoiceNumber,
        4 => $invoiceDate,
        5 => $supportPhone,
    ],
    'button_vars' => $buttonVars,
    'file'        => [
        'type' => 'image',
        'link' => $imageLink,
    ],
]);

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
echo json_encode(['message' => 'Payment WhatsApp message sent successfully.']);
