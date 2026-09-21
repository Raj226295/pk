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

// Get phone from request body
$body  = json_decode(file_get_contents('php://input'), true);
$phone = trim($body['phone'] ?? '');

if (!$phone) {
    http_response_code(422);
    echo json_encode(['error' => 'Phone number is required.']);
    exit;
}

// Build WhatsApp payload
$payload = json_encode([
    'phone'       => $phone,
    'auth_token'  => 'de955238e3dba02bd8137e535adc70de',
    'template_id' => '05e2a550-5aba-46e5-a798-67a36a0e45bb',
    'header_vars' => [],
    'body_vars'   => [],
    'button_vars' => [],
    'file'        => [
        'type' => 'image',
        'link' => 'https://www.pkbusinesssolution.in/assets/home-hero-profile-wiazK9b7.jpg',
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
echo json_encode(['message' => 'WhatsApp message sent successfully.']);
