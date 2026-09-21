<?php
declare(strict_types=1);

use Cloudinary\Api\Exception\ApiError;

function ensure_directory(string $path): void
{
    if (!is_dir($path) && !mkdir($path, 0777, true) && !is_dir($path)) {
        throw new AppError(500, 'Unable to create required storage directory.');
    }
}

function sanitize_storage_segment(string $value): string
{
    $normalized = strtolower(trim($value));
    $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';
    $normalized = trim($normalized, '-');
    return substr($normalized !== '' ? $normalized : 'client', 0, 48);
}

function build_client_folder_name(array $user): string
{
    $label = sanitize_storage_segment($user['name'] ?? $user['email'] ?? 'client');
    $suffix = substr((string) ($user['id'] ?? ''), -6) ?: 'folder';
    return $label . '-' . $suffix;
}

function build_cloudinary_folder_path(string $relativeDir): string
{
    $clean = trim(str_replace('\\', '/', $relativeDir), '/');
    $root = cloudinary_folder_root();

    if ($root === '') {
        return $clean;
    }

    return $clean === '' ? $root : $root . '/' . $clean;
}

function build_user_storage_relative_dir(string $userId, string $serviceName): string
{
    $safeUserId = preg_replace('/[^A-Za-z0-9_-]+/', '-', $userId) ?? $userId;
    $safeUserId = trim($safeUserId, '-');
    $safeUserId = $safeUserId !== '' ? $safeUserId : 'anonymous';

    return 'users/user_' . $safeUserId . '/' . sanitize_storage_segment($serviceName) . '/files';
}

function build_admin_storage_relative_dir(string $scope): string
{
    return 'admin/' . sanitize_storage_segment($scope) . '/files';
}

function upload_absolute_path(string $relativePath): string
{
    return UPLOADS_ROOT . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($relativePath, '/\\'));
}

function build_public_upload_url(string $relativePath): string
{
    $clean = trim(str_replace('\\', '/', $relativePath), '/');
    return '/uploads/' . $clean;
}

function upload_storage_driver(): string
{
    $configured = strtolower(trim((string) env_value('UPLOAD_STORAGE', '')));

    if (in_array($configured, ['cloudinary', 'local'], true)) {
        return $configured;
    }

    return cloudinary_is_configured() ? 'cloudinary' : 'local';
}

function ensure_client_document_folder(array $user, string $serviceType = 'General'): array
{
    $relativeDir = build_user_storage_relative_dir((string) ($user['id'] ?? ''), $serviceType);

    return [
        'folderName' => build_client_folder_name($user),
        'relativeDir' => $relativeDir,
        'cloudinaryFolder' => build_cloudinary_folder_path($relativeDir),
    ];
}

function upload_max_bytes(): int
{
    $configuredMb = number_from_input(env_value('UPLOAD_MAX_FILE_SIZE_MB', '5'), 5);
    $sizeInMb = max(1, $configuredMb);
    return (int) round($sizeInMb * 1024 * 1024);
}

function detect_uploaded_mime_type(string $path, string $fallback = 'application/octet-stream'): string
{
    $detected = null;

    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);

        if ($finfo !== false) {
            $value = finfo_file($finfo, $path);
            finfo_close($finfo);
            $detected = is_string($value) ? $value : null;
        }
    }

    if (($detected === null || $detected === '') && function_exists('mime_content_type')) {
        $value = mime_content_type($path);
        $detected = is_string($value) ? $value : null;
    }

    return ($detected !== null && $detected !== '') ? $detected : $fallback;
}

function normalize_uploaded_mime_type(string $mimeType, string $extension, string $path = ''): string
{
    $normalized = strtolower(trim($mimeType));
    $extension = strtolower(trim($extension));
    $hasPdfSignature = false;
    $imageMime = '';

    if ($path !== '' && is_file($path)) {
        $imageInfo = @getimagesize($path);
        $imageMime = strtolower((string) ($imageInfo['mime'] ?? ''));

        if (in_array($imageMime, ['image/png', 'image/jpeg'], true)) {
            return $imageMime;
        }

        $handle = @fopen($path, 'rb');

        if ($handle !== false) {
            $header = fread($handle, 4);
            fclose($handle);

            if ($header === '%PDF') {
                $hasPdfSignature = true;
                return 'application/pdf';
            }
        }
    }

    if (in_array($normalized, ['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf'], true)) {
        return 'application/pdf';
    }

    if (in_array($normalized, ['image/jpeg', 'image/jpg', 'image/pjpeg'], true)) {
        return 'image/jpeg';
    }

    if (in_array($normalized, ['image/png', 'image/x-png'], true)) {
        return 'image/png';
    }

    if (in_array($normalized, ['application/octet-stream', 'binary/octet-stream', ''], true)) {
        if ($extension === 'pdf' && $hasPdfSignature) {
            return 'application/pdf';
        }

        if (in_array($extension, ['jpg', 'jpeg'], true) && $imageMime === 'image/jpeg') {
            return 'image/jpeg';
        }

        if ($extension === 'png' && $imageMime === 'image/png') {
            return 'image/png';
        }
    }

    return $normalized;
}

function validate_uploaded_file_content(string $path, string $extension, string $detectedMime = '', string $clientMime = ''): string
{
    $extension = strtolower(trim($extension));
    $signatureMime = detect_uploaded_file_signature_mime($path);
    $detectedMime = strtolower(trim($detectedMime));
    $clientMime = strtolower(trim($clientMime));

    if (in_array($extension, ['png', 'jpg', 'jpeg'], true)) {
        if ($extension === 'png' && in_array('image/png', [$signatureMime, $detectedMime, $clientMime], true)) {
            return 'image/png';
        }

        if (
            in_array($extension, ['jpg', 'jpeg'], true)
            && array_intersect([$signatureMime, $detectedMime, $clientMime], ['image/jpeg', 'image/jpg', 'image/pjpeg']) !== []
        ) {
            return 'image/jpeg';
        }
    }

    if (
        $extension === 'pdf'
        && array_intersect([$signatureMime, $detectedMime, $clientMime], ['application/pdf', 'application/x-pdf', 'application/acrobat']) !== []
    ) {
        return 'application/pdf';
    }

    error_log(
        'Upload validation failed: extension=' . $extension
        . ', signatureMime=' . $signatureMime
        . ', detectedMime=' . $detectedMime
        . ', clientMime=' . $clientMime,
    );
    throw new AppError(400, 'Only PDF, JPG, and PNG files are allowed.');
}

function detect_uploaded_file_signature_mime(string $path): string
{
    $handle = @fopen($path, 'rb');

    if ($handle === false) {
        return '';
    }

    $bytes = fread($handle, 12);
    fclose($handle);

    if (!is_string($bytes) || $bytes === '') {
        return '';
    }

    if (str_starts_with($bytes, "\x89PNG\r\n\x1A\n")) {
        return 'image/png';
    }

    if (str_starts_with($bytes, "\xFF\xD8\xFF")) {
        return 'image/jpeg';
    }

    if (str_starts_with($bytes, '%PDF')) {
        return 'application/pdf';
    }

    return '';
}

function build_cloudinary_public_id(string $originalName): string
{
    $baseName = sanitize_storage_segment((string) pathinfo($originalName, PATHINFO_FILENAME));
    $suffix = substr(str_replace('-', '', uuid_v4()), 0, 12);
    return $baseName . '-' . $suffix;
}

function build_cloudinary_upload_public_id(string $originalName, string $extension, string $resourceType): string
{
    $publicId = build_cloudinary_public_id($originalName);

    if ($resourceType === 'raw' && $extension !== '') {
        return $publicId . '.' . strtolower($extension);
    }

    return $publicId;
}

function cloudinary_resource_type_for_upload(string $mimeType, string $extension): string
{
    $extension = strtolower(trim($extension));

    if ($extension === 'pdf') {
        return 'raw';
    }

    if (in_array($extension, ['png', 'jpg', 'jpeg'], true)) {
        return 'image';
    }

    throw new AppError(400, 'Only PDF, JPG, and PNG files are allowed.');
}

function cloudinary_allowed_formats_for_upload(string $mimeType): array
{
    if (strcasecmp($mimeType, 'application/pdf') === 0) {
        return ['pdf'];
    }

    if (strcasecmp($mimeType, 'image/png') === 0) {
        return ['png'];
    }

    if (strcasecmp($mimeType, 'image/jpeg') === 0) {
        return ['jpg', 'jpeg'];
    }

    throw new AppError(400, 'Only PDF, JPG, and PNG files are allowed.');
}

function cloudinary_allowed_formats_for_extension(string $extension): array
{
    $extension = strtolower(trim($extension));

    if ($extension === 'pdf') {
        return ['pdf'];
    }

    if ($extension === 'png') {
        return ['png'];
    }

    if (in_array($extension, ['jpg', 'jpeg'], true)) {
        return ['jpg', 'jpeg'];
    }

    throw new AppError(400, 'Only PDF, JPG, and PNG files are allowed.');
}

function build_local_upload_filename(string $originalName, string $extension): string
{
    $baseName = sanitize_storage_segment((string) pathinfo($originalName, PATHINFO_FILENAME));
    $suffix = substr(str_replace('-', '', uuid_v4()), 0, 12);
    $filename = $baseName . '-' . $suffix;

    return $extension === '' ? $filename : $filename . '.' . $extension;
}

function store_uploaded_file_locally(
    string $tmpName,
    string $originalName,
    string $extension,
    string $mimeType,
    string $relativeDir
): array {
    $cleanDir = trim(str_replace('\\', '/', $relativeDir), '/');
    $filename = build_local_upload_filename($originalName, $extension);
    $relativePath = ($cleanDir === '' ? '' : $cleanDir . '/') . $filename;
    $absolutePath = upload_absolute_path($relativePath);

    ensure_directory(dirname($absolutePath));

    if (!move_uploaded_file($tmpName, $absolutePath)) {
        throw new AppError(500, 'Unable to store the uploaded file.');
    }

    return [
        'filename' => $filename,
        'originalName' => $originalName,
        'relativePath' => $relativePath,
        'fileUrl' => build_public_upload_url($relativePath),
        'mimeType' => $mimeType !== '' ? $mimeType : 'application/octet-stream',
        'resourceType' => 'local',
        'storageFolder' => $cleanDir,
    ];
}

function store_uploaded_file(array $file, string $relativeDir, array $allowedExtensions = [], array $allowedMimePrefixes = []): array
{
    if (function_exists('set_time_limit')) {
        @set_time_limit(120);
    }

    $uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if (in_array($uploadError, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        throw new AppError(400, 'File size must be 5 MB or less.');
    }

    if ($uploadError !== UPLOAD_ERR_OK) {
        throw new AppError(400, 'Please upload a valid file.');
    }

    $originalName = (string) ($file['name'] ?? 'file');
    $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
    $tmpName = (string) ($file['tmp_name'] ?? '');
    $size = (int) ($file['size'] ?? 0);

    if ($tmpName === '' || !is_file($tmpName)) {
        throw new AppError(400, 'Uploaded file payload is invalid.');
    }

    if ($size <= 0) {
        throw new AppError(400, 'Uploaded file is empty.');
    }

    if ($size > upload_max_bytes()) {
        throw new AppError(400, 'File size must be 5 MB or less.');
    }

    if ($allowedExtensions !== [] && !in_array($extension, $allowedExtensions, true)) {
        throw new AppError(400, 'Only PDF, JPG, and PNG files are allowed.');
    }

    $detectedMimeType = detect_uploaded_mime_type($tmpName, (string) ($file['type'] ?? 'application/octet-stream'));
    $mimeType = validate_uploaded_file_content(
        $tmpName,
        $extension,
        $detectedMimeType,
        (string) ($file['type'] ?? ''),
    );

    if ($allowedMimePrefixes !== []) {
        $allowed = false;

        foreach ($allowedMimePrefixes as $pattern) {
            if ($pattern !== '' && str_ends_with($pattern, '/')) {
                if (str_starts_with($mimeType, $pattern)) {
                    $allowed = true;
                    break;
                }
            } elseif (strcasecmp($mimeType, $pattern) === 0) {
                $allowed = true;
                break;
            }
        }

        if (!$allowed) {
            throw new AppError(400, 'Only PDF, JPG, and PNG files are allowed.');
        }
    }

    if (upload_storage_driver() === 'local') {
        return store_uploaded_file_locally($tmpName, $originalName, $extension, $mimeType, $relativeDir);
    }

    $folder = build_cloudinary_folder_path($relativeDir);
    $resourceType = cloudinary_resource_type_for_upload($mimeType, $extension);
    $cloudinaryAllowedFormats = cloudinary_allowed_formats_for_extension($extension);
    $cloudinaryPublicId = build_cloudinary_upload_public_id($originalName, $extension, $resourceType);

    try {
        $uploaded = cloudinary_client()->uploadApi()->upload($tmpName, [
            'folder' => $folder,
            'public_id' => $cloudinaryPublicId,
            'resource_type' => $resourceType,
            'use_filename' => false,
            'unique_filename' => false,
            'overwrite' => false,
            'filename_override' => $originalName,
            'allowed_formats' => $cloudinaryAllowedFormats,
        ]);
        if (is_file($tmpName)) {
            @unlink($tmpName);
        }
    } catch (AppError $error) {
        throw $error;
    } catch (ApiError $error) {
        error_log(
            'Cloudinary upload failed: ' . $error->getMessage()
            . ' | extension=' . $extension
            . ' | mimeType=' . $mimeType
            . ' | resourceType=' . $resourceType
            . ' | publicId=' . $cloudinaryPublicId
            . ' | allowedFormats=' . implode(',', $cloudinaryAllowedFormats),
        );
        throw new AppError(502, 'Unable to upload the file to Cloudinary.');
    } catch (Throwable $error) {
        error_log(
            'Cloudinary upload failed: ' . $error->getMessage()
            . ' | extension=' . $extension
            . ' | mimeType=' . $mimeType
            . ' | resourceType=' . $resourceType
            . ' | publicId=' . $cloudinaryPublicId
            . ' | allowedFormats=' . implode(',', $cloudinaryAllowedFormats),
        );
        throw new AppError(502, 'Unable to upload the file to Cloudinary.');
    }

    $publicId = (string) ($uploaded['public_id'] ?? '');
    $fileUrl = (string) ($uploaded['secure_url'] ?? '');
    $resourceType = (string) ($uploaded['resource_type'] ?? '');
    $format = strtolower((string) ($uploaded['format'] ?? $extension));

    if ($publicId === '' || $fileUrl === '') {
        throw new AppError(502, 'Cloudinary did not return the uploaded file details.');
    }

    if (strcasecmp($mimeType, 'application/pdf') === 0 && !str_contains($fileUrl, '/raw/upload/')) {
        throw new AppError(502, 'Cloudinary returned an invalid PDF upload URL.');
    }

    $filename = basename($publicId);

    if ($format !== '' && !str_ends_with(strtolower($filename), '.' . $format)) {
        $filename .= '.' . $format;
    }

    return [
        'filename' => $filename,
        'originalName' => $originalName,
        'relativePath' => $publicId,
        'fileUrl' => $fileUrl,
        'mimeType' => $mimeType !== '' ? $mimeType : 'application/octet-stream',
        'resourceType' => $resourceType,
        'storageFolder' => $folder,
    ];
}

function cloudinary_reference_from_url(string $url): ?array
{
    $path = parse_url($url, PHP_URL_PATH);

    if (!is_string($path) || $path === '') {
        return null;
    }

    if (!preg_match('#/(image|raw|video)/upload/(?:v\d+/)?(.+)$#', $path, $matches)) {
        return null;
    }

    $publicId = urldecode((string) $matches[2]);
    $publicId = preg_replace('/\.[^./]+$/', '', $publicId) ?? $publicId;

    return [
        'resourceType' => (string) $matches[1],
        'publicId' => $publicId,
    ];
}

function cloudinary_format_from_path(string $pathOrUrl, string $fallbackName = ''): string
{
    $path = parse_url($pathOrUrl, PHP_URL_PATH);
    $extension = is_string($path) ? strtolower((string) pathinfo($path, PATHINFO_EXTENSION)) : '';

    if ($extension !== '') {
        return $extension;
    }

    return strtolower((string) pathinfo($fallbackName, PATHINFO_EXTENSION));
}

function cloudinary_signed_download_url(string $pathOrUrl, string $downloadName = ''): ?string
{
    if (!cloudinary_is_configured()) {
        return null;
    }

    $reference = preg_match('#^https?://#i', $pathOrUrl) === 1
        ? cloudinary_reference_from_url($pathOrUrl)
        : [
            'resourceType' => 'image',
            'publicId' => preg_replace('/\.[^./]+$/', '', trim($pathOrUrl, '/')) ?? trim($pathOrUrl, '/'),
        ];

    if ($reference === null || ($reference['publicId'] ?? '') === '') {
        return null;
    }

    $format = cloudinary_format_from_path($pathOrUrl, $downloadName);

    if ($format === '') {
        return null;
    }

    return cloudinary_client()->uploadApi()->privateDownloadUrl(
        (string) $reference['publicId'],
        $format,
        [
            'resource_type' => (string) ($reference['resourceType'] ?? 'image'),
            'type' => 'upload',
            'attachment' => true,
            'expires_at' => time() + 300,
        ],
    );
}

function delete_cloudinary_upload(string $pathOrUrl): void
{
    if (!cloudinary_is_configured()) {
        return;
    }

    $isRemoteUrl = preg_match('#^https?://#i', $pathOrUrl) === 1;
    $reference = $isRemoteUrl ? cloudinary_reference_from_url($pathOrUrl) : null;

    if ($isRemoteUrl && $reference === null) {
        return;
    }

    if ($reference !== null) {
        $publicId = (string) ($reference['publicId'] ?? '');
        $resourceTypes = [(string) ($reference['resourceType'] ?? 'image')];
    } else {
        $publicId = trim($pathOrUrl, '/');
        $resourceTypes = ['image', 'raw'];
    }

    if ($publicId === '') {
        return;
    }

    foreach (array_values(array_unique($resourceTypes)) as $resourceType) {
        try {
            $result = cloudinary_client()->uploadApi()->destroy($publicId, [
                'resource_type' => $resourceType,
                'invalidate' => true,
            ]);

            $status = strtolower((string) ($result['result'] ?? ''));

            if (in_array($status, ['ok', 'not found'], true)) {
                return;
            }
        } catch (ApiError $error) {
            error_log('Cloudinary delete failed: ' . $error->getMessage());
        } catch (Throwable $error) {
            error_log('Cloudinary delete failed: ' . $error->getMessage());
        }
    }
}

function delete_upload(?string $pathOrUrl): void
{
    if ($pathOrUrl === null || $pathOrUrl === '') {
        return;
    }

    if (preg_match('#^https?://#i', $pathOrUrl)) {
        delete_cloudinary_upload($pathOrUrl);
        return;
    }

    $relative = $pathOrUrl;

    if (str_starts_with($relative, '/uploads/')) {
        $relative = substr($relative, 9);
    }

    $absolute = upload_absolute_path($relative);

    if (is_file($absolute)) {
        @unlink($absolute);
    }
}

function delete_directory_tree(string $absolutePath): void
{
    if (!is_dir($absolutePath)) {
        return;
    }

    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($absolutePath, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );

    foreach ($items as $item) {
        if ($item->isDir()) {
            @rmdir($item->getPathname());
        } else {
            @unlink($item->getPathname());
        }
    }

    @rmdir($absolutePath);
}

function remote_file_contents(string $url, ?string $fallbackUrl = null): string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);

        if ($ch === false) {
            throw new AppError(502, 'Unable to download the requested file.');
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($response === false || $statusCode >= 400) {
            if ($fallbackUrl !== null && $fallbackUrl !== $url) {
                return remote_file_contents($fallbackUrl);
            }

            throw new AppError(502, 'Unable to download the requested file.');
        }

        return (string) $response;
    }

    $response = @file_get_contents($url);

    if ($response === false) {
        if ($fallbackUrl !== null && $fallbackUrl !== $url) {
            return remote_file_contents($fallbackUrl);
        }

        throw new AppError(502, 'Unable to download the requested file.');
    }

    return $response;
}

function send_attachment_headers(string $downloadName, string $mimeType, ?int $contentLength = null): void
{
    $fallbackName = preg_replace('/[^A-Za-z0-9._-]+/', '_', $downloadName) ?? 'download';
    $fallbackName = $fallbackName !== '' ? $fallbackName : 'download';

    header('Content-Type: ' . $mimeType);

    if ($contentLength !== null) {
        header('Content-Length: ' . (string) $contentLength);
    }

    header('Content-Disposition: attachment; filename="' . $fallbackName . '"; filename*=UTF-8\'\'' . rawurlencode($downloadName));
}

function send_download_file(string $relativePath, string $downloadName, ?string $fileUrl = null, ?string $mimeType = null): void
{
    if ($fileUrl !== null && preg_match('#^https?://#i', $fileUrl)) {
        $signedUrl = cloudinary_signed_download_url($fileUrl, $downloadName);
        $contents = remote_file_contents($signedUrl ?? $fileUrl, $signedUrl === null ? null : $fileUrl);
        send_attachment_headers($downloadName, $mimeType ?: 'application/octet-stream', strlen($contents));
        echo $contents;
        return;
    }

    $absolute = upload_absolute_path($relativePath);

    if (!is_file($absolute)) {
        throw new AppError(404, 'Stored file could not be found');
    }

    $mime = $mimeType ?: (mime_content_type($absolute) ?: 'application/octet-stream');
    send_attachment_headers($downloadName, $mime, (int) filesize($absolute));
    readfile($absolute);
}
