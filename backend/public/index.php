<?php

declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'bootstrap.php';
require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'user_handlers.php';
require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'admin_handlers.php';

try {
    apply_common_headers();

    if (request_method() === 'OPTIONS') {
        http_response_code(204);
        return;
    }

    $method = request_method();
    $path = request_path();

    if ($method === 'GET' && $path === '/api/health') {
        json_response(['status' => 'ok']);
        return;
    }

    $db = app_context()['db'];

    if ($method === 'POST' && $path === '/api/auth/register') {
        handle_register($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/whatsapp/send') {
        require_once dirname(__DIR__) . '/whatsapp_message_api/welcome_message.php';
        return;
    }

    if ($method === 'POST' && $path === '/api/auth/login') {
        handle_login($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/blogs') {
        handle_get_blogs($db);
        return;
    }

    if ($method === 'GET' && ($params = route_match($path, '/api/blogs/(?P<slug>[^/]+)'))) {
        handle_get_blog_by_slug($db, $params['slug']);
        return;
    }

    if ($method === 'POST' && $path === '/api/contact') {
        handle_submit_contact($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/services/public-catalog') {
        handle_get_public_service_catalog($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/payments/razorpay-webhook') {
        handle_razorpay_webhook($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/user/profile') {
        handle_get_profile($db);
        return;
    }

    if ($method === 'PUT' && $path === '/api/user/profile') {
        handle_update_profile($db);
        return;
    }

    if ($method === 'PUT' && $path === '/api/user/profile/image') {
        handle_update_profile_image($db);
        return;
    }

    if ($method === 'PUT' && $path === '/api/user/password') {
        handle_change_password($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/services/catalog') {
        handle_get_service_catalog_for_users($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/services') {
        handle_get_user_services($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/services/request') {
        handle_request_service($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/documents') {
        handle_get_user_documents($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/documents/upload') {
        handle_upload_document($db, false);
        return;
    }

    if ($method === 'GET' && ($params = route_match($path, '/api/documents/(?P<id>[^/]+)/download'))) {
        handle_download_document($db, $params['id'], false);
        return;
    }

    if ($method === 'GET' && $path === '/api/appointments') {
        handle_get_user_appointments($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/appointments') {
        handle_create_appointment($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/payments') {
        handle_get_user_payments($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/payments') {
        handle_create_payment($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/payments/verify') {
        handle_verify_payment($db);
        return;
    }

    if ($method === 'GET' && ($params = route_match($path, '/api/payments/(?P<id>[^/]+)/receipt'))) {
        handle_get_user_payment_receipt($db, $params['id']);
        return;
    }

    if ($method === 'POST' && ($params = route_match($path, '/api/payments/(?P<id>[^/]+)/receipt-upload'))) {
        handle_upload_payment_receipt($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/notifications') {
        handle_get_notifications($db);
        return;
    }

    if ($method === 'PATCH' && $path === '/api/notifications/read-all') {
        handle_mark_all_notifications_as_read($db);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/notifications/(?P<id>[^/]+)/read'))) {
        handle_mark_notification_as_read($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/overview') {
        handle_admin_overview($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/messages') {
        handle_admin_messages($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/contact-messages') {
        handle_admin_contact_messages($db);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/blogs') {
        handle_admin_get_blogs($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/admin/blogs') {
        handle_admin_create_blog($db);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/admin/blogs/(?P<id>[^/]+)'))) {
        handle_admin_update_blog($db, $params['id']);
        return;
    }

    if ($method === 'DELETE' && ($params = route_match($path, '/api/admin/blogs/(?P<id>[^/]+)'))) {
        handle_admin_delete_blog($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/users') {
        handle_admin_get_users($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/admin/users') {
        handle_admin_create_user($db);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/admin/users/(?P<id>[^/]+)/block'))) {
        handle_admin_toggle_user_block($db, $params['id']);
        return;
    }

    if ($method === 'POST' && ($params = route_match($path, '/api/admin/users/(?P<id>[^/]+)/message'))) {
        handle_admin_send_user_message($db, $params['id']);
        return;
    }

    if ($method === 'DELETE' && ($params = route_match($path, '/api/admin/users/(?P<id>[^/]+)'))) {
        handle_admin_delete_user($db, $params['id']);
        return;
    }

    if ($method === 'GET' && ($params = route_match($path, '/api/admin/users/(?P<id>[^/]+)'))) {
        handle_admin_get_user_details($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/documents') {
        handle_admin_get_documents($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/admin/documents/upload') {
        handle_upload_document($db, true);
        return;
    }

    if ($method === 'POST' && $path === '/api/admin/prepared-documents') {
        handle_admin_upload_prepared_document($db);
        return;
    }

    if ($method === 'GET' && ($params = route_match($path, '/api/admin/documents/(?P<id>[^/]+)/download'))) {
        handle_download_document($db, $params['id'], true);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/admin/documents/(?P<id>[^/]+)'))) {
        handle_admin_review_document($db, $params['id']);
        return;
    }

    if ($method === 'DELETE' && ($params = route_match($path, '/api/admin/documents/(?P<id>[^/]+)'))) {
        handle_admin_delete_document($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/service-catalog') {
        handle_admin_get_service_catalog($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/admin/service-catalog') {
        handle_admin_create_service_catalog_item($db);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/admin/service-catalog/(?P<id>[^/]+)'))) {
        handle_admin_update_service_catalog_item($db, $params['id']);
        return;
    }

    if ($method === 'DELETE' && ($params = route_match($path, '/api/admin/service-catalog/(?P<id>[^/]+)'))) {
        handle_admin_delete_service_catalog_item($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/services') {
        handle_admin_get_services($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/admin/services') {
        handle_admin_assign_service($db);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/admin/services/(?P<id>[^/]+)'))) {
        handle_admin_update_service($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/appointments') {
        handle_admin_get_appointments($db);
        return;
    }

    if ($method === 'POST' && $path === '/api/admin/appointments') {
        handle_admin_create_appointment($db);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/admin/appointments/(?P<id>[^/]+)'))) {
        handle_admin_update_appointment($db, $params['id']);
        return;
    }

    if ($method === 'GET' && $path === '/api/admin/payments') {
        handle_admin_get_payments($db);
        return;
    }

    if ($method === 'GET' && ($params = route_match($path, '/api/admin/payments/(?P<id>[^/]+)/receipt'))) {
        handle_admin_get_payment_receipt($db, $params['id']);
        return;
    }

    if ($method === 'PATCH' && ($params = route_match($path, '/api/admin/payments/(?P<id>[^/]+)'))) {
        handle_admin_update_payment($db, $params['id']);
        return;
    }

    if ($method === 'DELETE' && ($params = route_match($path, '/api/admin/payments/(?P<id>[^/]+)'))) {
        handle_admin_delete_payment($db, $params['id']);
        return;
    }

    throw new AppError(404, 'Route not found');
} catch (AppError $error) {
    json_response(['message' => $error->getMessage()], $error->status);
} catch (Throwable $error) {
    error_log($error->getMessage() . PHP_EOL . $error->getTraceAsString());
    json_response(['message' => 'Something went wrong. Please try again.'], 500);
}
