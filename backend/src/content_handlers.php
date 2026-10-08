<?php
declare(strict_types=1);

/* Public CMS and its admin API. The whitelist below is intentionally the only
 * place where HTTP resource names can become SQL table names. */
function cms_slug(string $value): string {
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    return trim($value, '-') ?: 'item-' . substr(uuid_v4(), 0, 8);
}

function cms_bool(mixed $value, bool $default = false): int {
    if ($value === null || $value === '') return $default ? 1 : 0;
    return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) === true || $value === 1 || $value === '1' ? 1 : 0;
}

function cms_resource(string $resource): array {
    $map = [
        'categories' => ['table' => 'content_categories', 'type' => 'category'],
        'services' => ['table' => 'public_services', 'type' => 'service'],
        'influencers' => ['table' => 'influencers', 'type' => 'influencer'],
        'testimonials' => ['table' => 'content_items', 'type' => 'testimonial'],
        'portfolio' => ['table' => 'content_items', 'type' => 'portfolio'],
        'faqs' => ['table' => 'content_items', 'type' => 'faq'],
        'homepage' => ['table' => 'content_items', 'type' => 'homepage'],
    ];
    if (!isset($map[$resource])) throw new AppError(404, 'Resource not found');
    return $map[$resource];
}

function cms_image_upload(): ?string {
    $file = request_file('image');
    if ($file === null) return null;
    $stored = store_uploaded_file($file, 'site-content', ['jpg', 'jpeg', 'png'], ['image/']);
    return (string) $stored['fileUrl'];
}

function cms_image_is_referenced(PDO $db, string $image): bool {
    if ($image === '') return false;
    foreach (['public_services', 'content_categories', 'influencers', 'content_items'] as $table) {
        if ((int) fetch_value($db, "SELECT COUNT(*) FROM `$table` WHERE image = :image", [':image' => $image]) > 0) return true;
    }
    return false;
}

function cms_row(array $row): array {
    foreach (['is_active', 'is_featured', 'display_order'] as $key) if (isset($row[$key])) $row[$key] = (int) $row[$key];
    if (isset($row['metadata']) && is_string($row['metadata'])) $row['metadata'] = json_decode($row['metadata'], true) ?: [];
    return $row;
}

function cms_list_public(PDO $db, string $resource): void {
    $definition = cms_resource($resource);
    $table = $definition['table'];
    $where = 'is_active = 1'; $params = [];
    if ($table === 'content_items') { $where .= ' AND content_type = :type'; $params[':type'] = $definition['type']; }
    if ($table === 'public_services' && isset($_GET['type']) && $_GET['type'] !== '') { $where .= ' AND service_type = :type'; $params[':type'] = substr((string) $_GET['type'], 0, 40); }
    $rows = fetch_all($db, "SELECT * FROM `$table` WHERE $where ORDER BY display_order ASC, created_at DESC", $params);
    json_response([$resource => array_map('cms_row', $rows)]);
}

function handle_public_site(PDO $db): void {
    $settings = fetch_all($db, 'SELECT setting_key, setting_value FROM website_settings');
    $settingMap = [];
    foreach ($settings as $setting) $settingMap[$setting['setting_key']] = $setting['setting_value'];
    $featured = fetch_all($db, "SELECT * FROM public_services WHERE is_active=1 AND is_featured=1 ORDER BY display_order ASC LIMIT 8");
    $testimonials = fetch_all($db, "SELECT * FROM content_items WHERE content_type='testimonial' AND is_active=1 ORDER BY display_order ASC LIMIT 12");
    $faqs = fetch_all($db, "SELECT * FROM content_items WHERE content_type='faq' AND is_active=1 ORDER BY display_order ASC LIMIT 12");
    json_response(['settings' => $settingMap, 'featuredServices' => array_map('cms_row', $featured), 'testimonials' => array_map('cms_row', $testimonials), 'faqs' => array_map('cms_row', $faqs)]);
}

function handle_public_service_by_slug(PDO $db, string $slug): void {
    $row = fetch_one($db, 'SELECT * FROM public_services WHERE slug = :slug LIMIT 1', [':slug' => $slug]);
    if ($row === null) throw new AppError(404, 'Service not found');
    json_response(['service' => cms_row($row), 'comingSoon' => !(bool) $row['is_active']]);
}

function cms_payload(string $resource, array $input, ?string $uploadedImage, ?array $current = null): array {
    $now = now_db(); $image = $uploadedImage ?? ($input['image'] ?? $current['image'] ?? '');
    $name = safe_trim($input['name'] ?? $input['title'] ?? '');
    if ($resource === 'categories') {
        if ($name === '') throw new AppError(422, 'Category name is required');
        return ['name'=>$name, 'slug'=>cms_slug((string)($input['slug'] ?? $name)), 'content_type'=>safe_trim($input['content_type'] ?? 'service'), 'description'=>safe_trim($input['description'] ?? ''), 'icon'=>safe_trim($input['icon'] ?? 'fileCheck'), 'image'=>$image, 'is_active'=>cms_bool($input['is_active'] ?? null, true), 'display_order'=>(int)($input['display_order'] ?? 0), 'updated_at'=>$now];
    }
    if ($resource === 'services') {
        if ($name === '') throw new AppError(422, 'Service name is required');
        return ['category_id'=>($input['category_id'] ?? '') ?: null, 'name'=>$name, 'slug'=>cms_slug((string)($input['slug'] ?? $name)), 'short_description'=>safe_trim($input['short_description'] ?? ''), 'full_description'=>safe_trim($input['full_description'] ?? $input['short_description'] ?? ''), 'price'=>max(0, (float)($input['price'] ?? 0)), 'image'=>$image, 'icon'=>safe_trim($input['icon'] ?? 'fileCheck'), 'service_type'=>safe_trim($input['service_type'] ?? 'tax'), 'is_featured'=>cms_bool($input['is_featured'] ?? null), 'is_active'=>cms_bool($input['is_active'] ?? null, true), 'display_order'=>(int)($input['display_order'] ?? 0), 'updated_at'=>$now];
    }
    if ($resource === 'influencers') {
        if ($name === '') throw new AppError(422, 'Influencer name is required');
        return ['name'=>$name, 'username'=>safe_trim($input['username'] ?? ''), 'platform'=>safe_trim($input['platform'] ?? ''), 'followers'=>safe_trim($input['followers'] ?? ''), 'engagement'=>safe_trim($input['engagement'] ?? ''), 'location'=>safe_trim($input['location'] ?? ''), 'booking_price'=>max(0, (float)($input['booking_price'] ?? 0)), 'niche'=>safe_trim($input['niche'] ?? ''), 'bio'=>safe_trim($input['bio'] ?? ''), 'profile_url'=>safe_trim($input['profile_url'] ?? ''), 'image'=>$image, 'is_featured'=>cms_bool($input['is_featured'] ?? null), 'is_active'=>cms_bool($input['is_active'] ?? null, true), 'display_order'=>(int)($input['display_order'] ?? 0), 'updated_at'=>$now];
    }
    if ($name === '') throw new AppError(422, 'Title is required');
    return ['content_type'=>cms_resource($resource)['type'], 'title'=>$name, 'slug'=>cms_slug((string)($input['slug'] ?? $name)), 'summary'=>safe_trim($input['summary'] ?? ''), 'body'=>safe_trim($input['body'] ?? ''), 'image'=>$image, 'metadata'=>json_encode($input['metadata'] ?? []), 'is_featured'=>cms_bool($input['is_featured'] ?? null), 'is_active'=>cms_bool($input['is_active'] ?? null, true), 'display_order'=>(int)($input['display_order'] ?? 0), 'updated_at'=>$now];
}

function handle_admin_cms_list(PDO $db, string $resource): void {
    require_admin($db); $definition = cms_resource($resource); $params=[]; $where='1=1';
    if ($definition['table'] === 'content_items') { $where='content_type=:type'; $params[':type']=$definition['type']; }
    $rows=fetch_all($db, "SELECT * FROM `{$definition['table']}` WHERE $where ORDER BY display_order ASC, created_at DESC", $params);
    json_response([$resource=>array_map('cms_row',$rows)]);
}
function handle_admin_cms_create(PDO $db, string $resource): void {
    require_admin($db); $definition=cms_resource($resource); $payload=cms_payload($resource, request_data(), cms_image_upload()); $payload=['id'=>uuid_v4(), ...$payload, 'created_at'=>now_db()];
    try { insert_row($db,$definition['table'],$payload); } catch (PDOException $e) { throw new AppError(422, 'A record with this slug already exists'); }
    if ($resource === 'influencers') copy_shared_influencer_requirements($db, $payload['id']);
    json_response(['message'=>'Created successfully', 'item'=>cms_row($payload)],201);
}
function handle_admin_cms_update(PDO $db, string $resource, string $id): void {
    require_admin($db); $definition=cms_resource($resource); $current=fetch_one($db,"SELECT * FROM `{$definition['table']}` WHERE id=:id LIMIT 1",[':id'=>$id]); if(!$current) throw new AppError(404,'Record not found');
    $image=cms_image_upload(); $payload=cms_payload($resource,request_data(),$image,$current);
    try { update_row($db,$definition['table'],$payload,'id=:id',[':id'=>$id]); } catch (PDOException $e) { throw new AppError(422,'A record with this slug already exists'); }
    if($image && $current['image'] !== $image && !cms_image_is_referenced($db,(string)$current['image'])) delete_upload((string)$current['image']);
    $updated=fetch_one($db,"SELECT * FROM `{$definition['table']}` WHERE id=:id",[':id'=>$id]); json_response(['message'=>'Updated successfully','item'=>cms_row($updated)]);
}
function handle_admin_cms_delete(PDO $db, string $resource, string $id): void {
    require_admin($db); $definition=cms_resource($resource); $current=fetch_one($db,"SELECT * FROM `{$definition['table']}` WHERE id=:id LIMIT 1",[':id'=>$id]); if(!$current) throw new AppError(404,'Record not found');
    execute_statement($db,"DELETE FROM `{$definition['table']}` WHERE id=:id",[':id'=>$id]); if(!cms_image_is_referenced($db,(string)$current['image'])) delete_upload((string)$current['image']); json_response(['message'=>'Deleted successfully']);
}
function handle_admin_settings(PDO $db): void { require_admin($db); if(request_method()==='GET'){ handle_public_site($db); return; } $input=request_data(); foreach($input as $key=>$value){ if(!preg_match('/^[a-z0-9_.-]{1,100}$/i',(string)$key)) continue; $statement=$db->prepare('INSERT INTO website_settings (setting_key,setting_value,updated_at) VALUES (:key,:value,:time) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_at=VALUES(updated_at)'); $statement->execute([':key'=>$key,':value'=>is_string($value)?$value:json_encode($value),':time'=>now_db()]); } json_response(['message'=>'Settings saved successfully']); }
