<?php
declare(strict_types=1);

function to_iso8601(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    $timezone = new DateTimeZone(env_value('APP_TIMEZONE', 'Asia/Kolkata'));
    $date = new DateTimeImmutable($value, $timezone);
    return $date->format(DateTimeInterface::ATOM);
}

function safe_trim(mixed $value, string $fallback = ''): string
{
    if (!is_string($value)) {
        return $fallback;
    }

    $trimmed = trim($value);
    return $trimmed === '' ? $fallback : $trimmed;
}

function bool_from_input(mixed $value, bool $fallback = false): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_int($value) || is_float($value)) {
        return (int) $value === 1;
    }

    if (!is_string($value)) {
        return $fallback;
    }

    $normalized = strtolower(trim($value));

    if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }

    if (in_array($normalized, ['0', 'false', 'no', 'off', ''], true)) {
        return false;
    }

    return $fallback;
}

function number_from_input(mixed $value, float $fallback = 0): float
{
    if (is_int($value) || is_float($value)) {
        return (float) $value;
    }

    if (!is_string($value) || trim($value) === '') {
        return $fallback;
    }

    return is_numeric($value) ? (float) $value : $fallback;
}

function clamp_number(mixed $value, float $min, float $max, float $fallback): float
{
    $parsed = number_from_input($value, $fallback);
    return max($min, min($max, $parsed));
}

function parse_datetime_input(mixed $value): ?string
{
    if (!is_string($value) || trim($value) === '') {
        return null;
    }

    $formats = ['Y-m-d\TH:i:s', 'Y-m-d\TH:i', DateTimeInterface::ATOM, 'Y-m-d H:i:s'];
    $timezone = new DateTimeZone(env_value('APP_TIMEZONE', 'Asia/Kolkata'));

    foreach ($formats as $format) {
        $date = DateTimeImmutable::createFromFormat($format, $value, $timezone);

        if ($date instanceof DateTimeImmutable) {
            return $date->format('Y-m-d H:i:s');
        }
    }

    $timestamp = strtotime($value);
    return $timestamp === false
        ? null
        : (new DateTimeImmutable('@' . $timestamp))->setTimezone($timezone)->format('Y-m-d H:i:s');
}

function prefixed_columns(string $alias, string $prefix, array $columns): string
{
    return implode(', ', array_map(
        static fn ($column) => sprintf('%s.%s AS %s%s', $alias, $column, $prefix, $column),
        $columns,
    ));
}

function extract_prefixed_row(array $row, string $prefix): ?array
{
    $extracted = [];

    foreach ($row as $key => $value) {
        if (str_starts_with($key, $prefix)) {
            $extracted[substr($key, strlen($prefix))] = $value;
        }
    }

    if (($extracted['id'] ?? null) === null || $extracted['id'] === '') {
        return null;
    }

    return $extracted;
}

function in_clause(array $values, string $prefix = 'p'): array
{
    if ($values === []) {
        return ['NULL', []];
    }

    $placeholders = [];
    $params = [];

    foreach (array_values($values) as $index => $value) {
        $name = ':' . $prefix . $index;
        $placeholders[] = $name;
        $params[$name] = $value;
    }

    return [implode(', ', $placeholders), $params];
}

function normalize_appointment_status(string $status = 'pending'): string
{
    $normalized = strtolower(trim($status));

    return match ($normalized) {
        'confirmed' => 'approved',
        'scheduled' => 'rescheduled',
        'pending', 'approved', 'rejected', 'rescheduled', 'completed', 'cancelled' => $normalized,
        default => 'pending',
    };
}

function title_case_label(string $value): string
{
    return ucwords(str_replace(['_', '-'], ' ', $value));
}

function resolve_service_status(mixed $value, string $fallback = 'pending'): string
{
    $normalized = strtolower(safe_trim(is_string($value) ? $value : '', $fallback));
    $valid = ['pending', 'approved', 'rejected', 'in progress', 'completed'];
    return in_array($normalized, $valid, true) ? $normalized : $fallback;
}

function is_service_active_status(string $status): bool
{
    return !in_array(strtolower($status), ['rejected', 'completed'], true);
}

function normalize_document_status_for_admin(?string $status): string
{
    if ($status === null || $status === '') {
        return 'not submitted';
    }

    return $status === 'verified' ? 'approved' : $status;
}

function normalize_payment_status_for_admin(?array $payment): string
{
    if ($payment === null) {
        return 'not initiated';
    }

    if (($payment['verification_status'] ?? '') === 'verified' || ($payment['status'] ?? '') === 'paid') {
        return 'paid';
    }

    if (($payment['verification_status'] ?? '') === 'rejected' || ($payment['status'] ?? '') === 'rejected') {
        return 'rejected';
    }

    return 'pending';
}

function format_datetime_label(?string $value): string
{
    if ($value === null || $value === '') {
        return 'Not available';
    }

    $date = new DateTimeImmutable($value, new DateTimeZone(env_value('APP_TIMEZONE', 'Asia/Kolkata')));
    return $date->format('d M Y, h:i A');
}

function build_invoice_number(): string
{
    return 'INV-' . time() . '-' . random_int(100, 999);
}

function build_appointment_notification_message(array $payload): string
{
    $status = normalize_appointment_status($payload['status'] ?? 'pending');
    $serviceType = $payload['serviceType'] ?? 'General consultation';
    $scheduledFor = format_datetime_label($payload['scheduledFor'] ?? null);

    return match ($status) {
        'approved' => "Your {$serviceType} appointment has been approved for {$scheduledFor}.",
        'rescheduled' => "Your {$serviceType} appointment has been rescheduled to {$scheduledFor}.",
        'rejected' => ($payload['rejectionReason'] ?? '') !== ''
            ? "Your {$serviceType} appointment was rejected: {$payload['rejectionReason']}."
            : "Your {$serviceType} appointment was rejected.",
        'completed' => "Your {$serviceType} appointment has been marked as completed.",
        'cancelled' => "Your {$serviceType} appointment has been cancelled.",
        default => "Your {$serviceType} appointment request has been submitted for admin review.",
    };
}

function create_razorpay_order(float $amount, string $receipt): ?array
{
    $keyId = env_value('RAZORPAY_KEY_ID');
    $keySecret = env_value('RAZORPAY_KEY_SECRET');

    if ($keyId === null || $keySecret === null || !function_exists('curl_init')) {
        return null;
    }

    $payload = json_encode([
        'amount' => (int) round($amount * 100),
        'currency' => 'INR',
        'receipt' => $receipt,
    ]);

    $ch = curl_init('https://api.razorpay.com/v1/orders');

    if ($ch === false) {
        return null;
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_USERPWD => $keyId . ':' . $keySecret,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($response === false || $statusCode >= 400) {
        return null;
    }

    $decoded = json_decode($response, true);
    return is_array($decoded) ? $decoded : null;
}
