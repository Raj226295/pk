<?php
declare(strict_types=1);

const SERVICE_FIELD_TYPES = ['text', 'number', 'date', 'select', 'checkbox', 'file', 'multiple_file'];

function service_node_slug(string $value): string
{
    $value = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $value) ?? ''));
    return trim($value, '-') ?: 'service-' . substr(uuid_v4(), 0, 8);
}

function service_node_row(array $row, array $requirements = []): array
{
    $row['is_active'] = (bool) $row['is_active'];
    $row['is_fixed_root'] = (bool) $row['is_fixed_root'];
    $row['price'] = (float) $row['price'];
    $row['metadata'] = json_decode((string) ($row['metadata'] ?? ''), true) ?: [];
    $row['requirements'] = $requirements;
    return $row;
}

function service_requirement_row(array $row): array
{
    $row['is_required'] = (bool) $row['is_required'];
    $row['max_file_size_mb'] = (int) $row['max_file_size_mb'];
    $row['options'] = json_decode((string) ($row['options_json'] ?? ''), true) ?: [];
    unset($row['options_json']);
    return $row;
}

function service_tree(PDO $db, bool $publicOnly): array
{
    $rows = fetch_all($db, 'SELECT * FROM service_nodes ORDER BY sort_order ASC, name ASC');
    $requirements = fetch_all($db, 'SELECT * FROM service_requirements ORDER BY sort_order ASC, label ASC');
    $requirementsByNode = [];
    foreach ($requirements as $requirement) $requirementsByNode[$requirement['service_node_id']][] = service_requirement_row($requirement);
    $byParent = [];
    foreach ($rows as $row) $byParent[$row['parent_id'] ?? ''][] = service_node_row($row, $requirementsByNode[$row['id']] ?? []);
    $build = function (?string $parentId, bool $ancestorEnabled = true) use (&$build, $byParent, $publicOnly): array {
        $items = [];
        foreach ($byParent[$parentId ?? ''] ?? [] as $node) {
            $visible = $ancestorEnabled && $node['is_active'];
            if ($publicOnly && !$visible) continue;
            $node['children'] = $build($node['id'], $visible);
            $items[] = $node;
        }
        return $items;
    };
    return $build(null);
}

function service_node_or_fail(PDO $db, string $id): array
{
    $node = fetch_one($db, 'SELECT * FROM service_nodes WHERE id = :id LIMIT 1', [':id' => $id]);
    if ($node === null) throw new AppError(404, 'Service not found');
    return $node;
}

function service_node_is_publicly_available(PDO $db, array $node): bool
{
    while (true) {
        if (!(bool) $node['is_active']) return false;
        $parentId = $node['parent_id'] ?? null;
        if ($parentId === null || $parentId === '') return true;
        $node = service_node_or_fail($db, (string) $parentId);
    }
}

function service_node_depth_and_root(PDO $db, array $node): array
{
    $depth = 0;
    while (($node['parent_id'] ?? null) !== null && $node['parent_id'] !== '') {
        $node = service_node_or_fail($db, (string) $node['parent_id']);
        $depth++;
    }
    return ['depth' => $depth, 'root' => $node];
}

function service_node_payload(array $input, ?array $current = null): array
{
    $name = safe_trim($input['name'] ?? $current['name'] ?? '');
    if ($name === '') throw new AppError(422, 'Service name is required');
    return [
        'name' => $name,
        'slug' => service_node_slug((string) ($input['slug'] ?? $current['slug'] ?? $name)),
        'description' => safe_trim($input['description'] ?? $current['description'] ?? ''),
        'price' => max(0, (float) ($input['price'] ?? $current['price'] ?? 0)),
        'image' => safe_trim($input['image'] ?? $current['image'] ?? ''),
        'metadata' => json_encode($input['metadata'] ?? (json_decode((string) ($current['metadata'] ?? ''), true) ?: [])),
        'is_active' => cms_bool($input['is_active'] ?? $current['is_active'] ?? true, true),
        'sort_order' => (int) ($input['sort_order'] ?? $current['sort_order'] ?? 0),
        'updated_at' => now_db(),
    ];
}

function handle_admin_service_tree(PDO $db): void
{
    require_admin($db);
    json_response(['services' => service_tree($db, false)]);
}

function handle_admin_service_node_create(PDO $db): void
{
    require_admin($db); $input = request_data(); $parentId = safe_trim($input['parent_id'] ?? '');
    if ($parentId === '') throw new AppError(422, 'A parent service is required');
    $parent = service_node_or_fail($db, $parentId);
    $position = service_node_depth_and_root($db, $parent);
    if ($position['root']['slug'] === 'tax-service' && $position['depth'] >= 2) {
        throw new AppError(422, 'Tax Service supports only sub services and sub-sub services');
    }
    $payload = service_node_payload($input);
    $payload = ['id' => uuid_v4(), 'parent_id' => $parentId, ...$payload, 'is_fixed_root' => 0, 'created_at' => now_db()];
    try { insert_row($db, 'service_nodes', $payload); } catch (PDOException $error) { throw new AppError(422, 'A service with this URL already exists'); }
    json_response(['message' => 'Service created', 'service' => service_node_row($payload)], 201);
}

function handle_admin_service_node_update(PDO $db, string $id): void
{
    require_admin($db); $current = service_node_or_fail($db, $id); $input = request_data();
    if ((int) $current['is_fixed_root'] === 1 && (
        (isset($input['name']) && safe_trim($input['name']) !== (string) $current['name']) ||
        (isset($input['slug']) && safe_trim($input['slug']) !== (string) $current['slug']) ||
        isset($input['parent_id'])
    )) throw new AppError(422, 'Main service names and structure are fixed');
    $payload = service_node_payload($input, $current);
    try { update_row($db, 'service_nodes', $payload, 'id = :id', [':id' => $id]); } catch (PDOException $error) { throw new AppError(422, 'A service with this URL already exists'); }
    $updated = service_node_or_fail($db, $id); json_response(['message' => 'Service updated', 'service' => service_node_row($updated)]);
}

function handle_admin_service_node_delete(PDO $db, string $id): void
{
    require_admin($db); $node = service_node_or_fail($db, $id);
    if ((int) $node['is_fixed_root'] === 1) throw new AppError(422, 'Main services cannot be deleted');
    execute_statement($db, 'DELETE FROM service_nodes WHERE id = :id', [':id' => $id]); json_response(['message' => 'Service deleted']);
}

function requirement_payload(array $input, ?array $current = null): array
{
    $type = safe_trim($input['field_type'] ?? $current['field_type'] ?? 'text');
    if (!in_array($type, SERVICE_FIELD_TYPES, true)) throw new AppError(422, 'Invalid field type');
    $label = safe_trim($input['label'] ?? $current['label'] ?? ''); if ($label === '') throw new AppError(422, 'Field label is required');
    $options = $input['options'] ?? json_decode((string) ($current['options_json'] ?? '[]'), true) ?: [];
    if (!is_array($options)) throw new AppError(422, 'Field options must be a list');
    return ['label'=>$label, 'help_text'=>safe_trim($input['help_text'] ?? $current['help_text'] ?? ''), 'field_type'=>$type, 'options_json'=>json_encode(array_values($options)), 'is_required'=>cms_bool($input['is_required'] ?? $current['is_required'] ?? false), 'accepted_file_types'=>safe_trim($input['accepted_file_types'] ?? $current['accepted_file_types'] ?? ''), 'max_file_size_mb'=>max(1, min(100, (int) ($input['max_file_size_mb'] ?? $current['max_file_size_mb'] ?? 10))), 'sort_order'=>(int) ($input['sort_order'] ?? $current['sort_order'] ?? 0), 'updated_at'=>now_db()];
}

function handle_admin_requirement_create(PDO $db, string $serviceId): void
{
    require_admin($db); service_node_or_fail($db, $serviceId); $payload = ['id'=>uuid_v4(), 'service_node_id'=>$serviceId, ...requirement_payload(request_data()), 'created_at'=>now_db()]; insert_row($db, 'service_requirements', $payload); json_response(['message'=>'Requirement created', 'requirement'=>service_requirement_row($payload)], 201);
}
function handle_admin_requirement_update(PDO $db, string $id): void
{
    require_admin($db); $current=fetch_one($db,'SELECT * FROM service_requirements WHERE id=:id LIMIT 1',[':id'=>$id]); if(!$current) throw new AppError(404,'Requirement not found'); $payload=requirement_payload(request_data(),$current); update_row($db,'service_requirements',$payload,'id=:id',[':id'=>$id]); json_response(['message'=>'Requirement updated']);
}
function handle_admin_requirement_delete(PDO $db, string $id): void
{
    require_admin($db); if(execute_statement($db,'DELETE FROM service_requirements WHERE id=:id',[':id'=>$id])===0) throw new AppError(404,'Requirement not found'); json_response(['message'=>'Requirement deleted']);
}

function handle_public_service_tree(PDO $db): void { json_response(['services' => service_tree($db, true)]); }

// Marketing and Web & Apps landing pages need to keep their service cards
// visible while their main service is paused. Requests are still protected by
// service_node_is_publicly_available(), which sends users to Coming Soon.
function handle_public_service_display_tree(PDO $db): void { json_response(['services' => service_tree($db, false)]); }

function handle_public_service_availability(PDO $db): void
{
    $roots = fetch_all($db, 'SELECT slug, name, is_active FROM service_nodes WHERE parent_id IS NULL ORDER BY sort_order ASC, name ASC');
    $services = [];
    foreach ($roots as $root) $services[$root['slug']] = ['name' => $root['name'], 'is_active' => (bool) $root['is_active']];
    json_response(['services' => $services]);
}

function handle_public_service_node(PDO $db, string $id): void
{
    $node=service_node_or_fail($db,$id); if(!service_node_is_publicly_available($db,$node)) throw new AppError(404,'Service not available');
    $requirements=fetch_all($db,'SELECT * FROM service_requirements WHERE service_node_id=:id ORDER BY sort_order ASC,label ASC',[':id'=>$id]); json_response(['service'=>service_node_row($node,array_map('service_requirement_row',$requirements))]);
}

function handle_create_dynamic_service_request(PDO $db): void
{
    $user=current_user($db); $input=request_data(); $node=service_node_or_fail($db,safe_trim($input['service_id'] ?? ''));
    if(!service_node_is_publicly_available($db,$node)) throw new AppError(422,'This service is coming soon');
    $requirements=fetch_all($db,'SELECT * FROM service_requirements WHERE service_node_id=:id ORDER BY sort_order ASC',[':id'=>$node['id']]);
    foreach($requirements as $requirement){
        $key='field_'.$requirement['id']; $file=request_file($key); $value=$input[$key]??null;
        $isFile=in_array($requirement['field_type'],['file','multiple_file'],true);
        if((int)$requirement['is_required']===1 && (($isFile && $file===null) || (!$isFile && trim((string)$value)===''))) throw new AppError(422,$requirement['label'].' is required');
        if($file !== null && (int)($file['size'] ?? 0) > ((int)$requirement['max_file_size_mb'] * 1024 * 1024)) throw new AppError(422,$requirement['label'].' exceeds the maximum file size');
    }
    $id=uuid_v4(); insert_row($db,'services',['id'=>$id,'user_id'=>$user['id'],'requested_by_client'=>1,'catalog_service_id'=>null,'type'=>$node['name'],'description'=>$node['description'],'price'=>$node['price'],'status'=>'pending','priority'=>'medium','notes'=>safe_trim($input['notes'] ?? ''),'admin_remarks'=>'','completed_at'=>null,'created_at'=>now_db(),'updated_at'=>now_db()]);
    foreach($requirements as $requirement){
        $key='field_'.$requirement['id']; $value=$input[$key]??null; $file=request_file($key); $documentId=null;
        if($file !== null){
            $allowed=array_filter(array_map('trim',explode(',',(string)$requirement['accepted_file_types'])));
            $extension=strtolower(pathinfo((string)($file['name'] ?? ''),PATHINFO_EXTENSION));
            if($allowed !== [] && !in_array($extension,$allowed,true)) throw new AppError(422,$requirement['label'].' has an unsupported file type');
            $stored=store_uploaded_file($file,build_user_storage_relative_dir((string)$user['id'],$node['name']),['pdf','png','jpg','jpeg'],['application/pdf','image/png','image/jpeg']); $documentId=uuid_v4();
            insert_row($db,'documents',['id'=>$documentId,'user_id'=>$user['id'],'uploaded_by_id'=>$user['id'],'title'=>$requirement['label'],'document_type'=>$requirement['label'],'service_type'=>$node['name'],'input_type'=>'file','text_value'=>'','filename'=>$stored['filename'],'original_name'=>$stored['originalName'],'relative_path'=>$stored['relativePath'],'storage_folder'=>$stored['storageFolder'],'file_url'=>$stored['fileUrl'],'mime_type'=>$stored['mimeType'],'status'=>'pending','remarks'=>'','notes'=>'','reviewed_by_id'=>null,'reviewed_at'=>null,'created_at'=>now_db(),'updated_at'=>now_db()]);
        }
        if(($value===null||$value==='') && $documentId===null) continue;
        insert_row($db,'service_requirement_values',['id'=>uuid_v4(),'service_id'=>$id,'requirement_id'=>$requirement['id'],'value_text'=>is_array($value)?json_encode($value):(string)$value,'document_id'=>$documentId,'created_at'=>now_db()]);
    }
    json_response(['message'=>'Service request submitted','serviceId'=>$id],201);
}
