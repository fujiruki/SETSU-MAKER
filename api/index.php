<?php
declare(strict_types=1);

define('DB_PATH', __DIR__ . '/database.sqlite');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('APP_ID', 'sm');

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0777, true);
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$db = initDb();

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/contents/sm/api#', '', $path);
$method = $_SERVER['REQUEST_METHOD'];

$body = json_decode(file_get_contents('php://input'), true) ?? [];

route($method, $path, $body, $db);

function route(string $method, string $path, array $body, PDO $db): void
{
    $parts = explode('/', trim($path, '/'));

    match (true) {
        $method === 'GET' && $path === '/health'
            => json(['status' => 'ok']),
        $method === 'GET' && $path === '/categories'
            => json(getCategories($db)),
        $method === 'POST' && $path === '/categories'
            => json(createCategory($db, $body)),
        $method === 'GET' && $path === '/tags'
            => json(getTags($db)),
        $method === 'POST' && $path === '/tags'
            => json(createTag($db, $body)),
        $method === 'GET' && $path === '/notes'
            => json(getNotes($db, $_GET)),
        $method === 'POST' && $path === '/notes'
            => json(createNote($db, $body)),
        $method === 'GET' && preg_match('#^/notes/([^/]+)$#', $path, $m)
            => json(getNote($db, $m[1])),
        $method === 'PUT' && preg_match('#^/notes/([^/]+)$#', $path, $m)
            => json(updateNote($db, $m[1], $body)),
        $method === 'DELETE' && preg_match('#^/notes/([^/]+)$#', $path, $m)
            => json(deleteNote($db, $m[1])),
        $method === 'POST' && preg_match('#^/notes/([^/]+)/steps/([^/]+)/photos$#', $path, $m)
            => json(uploadPhoto($db, $m[1], $m[2])),
        default => error(404, 'Not Found'),
    };
}

function json(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
}

function error(int $status, string $message): void
{
    json(['error' => $message], $status);
}

function initDb(): PDO
{
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA journal_mode=WAL');

    $db->exec("
        CREATE TABLE IF NOT EXISTS sm_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sm_tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sm_notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category_id TEXT NOT NULL,
            steps_json TEXT NOT NULL DEFAULT '[]',
            tag_ids_json TEXT NOT NULL DEFAULT '[]',
            eyecatch_photo_id TEXT,
            handwriting_data TEXT,
            is_favorite INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    ");

    return $db;
}

function uuid(): string
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function now(): string
{
    return date('c');
}

function getCategories(PDO $db): array
{
    $rows = $db->query("SELECT id, name, parent_id as parentId, sort_order as \"order\" FROM sm_categories ORDER BY sort_order")->fetchAll();
    return array_map(fn($r) => ['id' => $r['id'], 'name' => $r['name'], 'parentId' => $r['parentId'], 'order' => (int)$r['order']], $rows);
}

function createCategory(PDO $db, array $body): array
{
    $id = uuid();
    $name = $body['name'] ?? '';
    $parentId = $body['parentId'] ?? null;
    $order = (int)($body['order'] ?? 0);
    $now = now();
    $stmt = $db->prepare("INSERT INTO sm_categories (id, name, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$id, $name, $parentId, $order, $now]);
    return ['id' => $id, 'name' => $name, 'parentId' => $parentId, 'order' => $order];
}

function getTags(PDO $db): array
{
    $q = $_GET['q'] ?? '';
    if ($q) {
        $stmt = $db->prepare("SELECT id, name FROM sm_tags WHERE name LIKE ? ORDER BY name LIMIT 20");
        $stmt->execute(['%' . $q . '%']);
    } else {
        $stmt = $db->query("SELECT id, name FROM sm_tags ORDER BY name");
    }
    return $stmt->fetchAll();
}

function createTag(PDO $db, array $body): array
{
    $id = uuid();
    $name = $body['name'] ?? '';
    $now = now();
    $stmt = $db->prepare("INSERT OR IGNORE INTO sm_tags (id, name, created_at) VALUES (?, ?, ?)");
    $stmt->execute([$id, $name, $now]);
    $existing = $db->prepare("SELECT id, name FROM sm_tags WHERE name = ?");
    $existing->execute([$name]);
    return $existing->fetch();
}

function getNotes(PDO $db, array $params): array
{
    $where = [];
    $binds = [];

    if (!empty($params['categoryId'])) {
        $where[] = 'category_id = ?';
        $binds[] = $params['categoryId'];
    }
    if (!empty($params['favorite'])) {
        $where[] = 'is_favorite = 1';
    }
    if (!empty($params['q'])) {
        $where[] = 'title LIKE ?';
        $binds[] = '%' . $params['q'] . '%';
    }

    $sql = "SELECT id, title, category_id as categoryId, tag_ids_json, eyecatch_photo_id as eyecatchPhotoId, is_favorite as isFavorite, created_at as createdAt, updated_at as updatedAt FROM sm_notes";
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY updated_at DESC LIMIT 100';

    $stmt = $db->prepare($sql);
    $stmt->execute($binds);
    return array_map(function ($r) {
        return [
            'id' => $r['id'],
            'title' => $r['title'],
            'categoryId' => $r['categoryId'],
            'tagIds' => json_decode($r['tag_ids_json'], true),
            'eyecatchUrl' => $r['eyecatchPhotoId'] ? '/contents/sm/api/uploads/' . $r['eyecatchPhotoId'] : null,
            'isFavorite' => (bool)$r['isFavorite'],
            'createdAt' => $r['createdAt'],
            'updatedAt' => $r['updatedAt'],
        ];
    }, $stmt->fetchAll());
}

function getNote(PDO $db, string $id): array|false
{
    $stmt = $db->prepare("SELECT * FROM sm_notes WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        error(404, 'Note not found');
        return false;
    }
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'categoryId' => $row['category_id'],
        'tagIds' => json_decode($row['tag_ids_json'], true),
        'steps' => json_decode($row['steps_json'], true),
        'eyecatchPhotoId' => $row['eyecatch_photo_id'],
        'handwritingData' => $row['handwriting_data'],
        'isFavorite' => (bool)$row['is_favorite'],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function createNote(PDO $db, array $body): array
{
    $id = uuid();
    $now = now();
    $stmt = $db->prepare("INSERT INTO sm_notes (id, title, category_id, steps_json, tag_ids_json, is_favorite, created_at, updated_at) VALUES (?, ?, ?, '[]', '[]', 0, ?, ?)");
    $stmt->execute([$id, $body['title'] ?? '', $body['categoryId'] ?? '', $now, $now]);
    return getNote($db, $id);
}

function updateNote(PDO $db, string $id, array $body): array
{
    $now = now();
    $stmt = $db->prepare("UPDATE sm_notes SET title=?, category_id=?, steps_json=?, tag_ids_json=?, eyecatch_photo_id=?, handwriting_data=?, is_favorite=?, updated_at=? WHERE id=?");
    $stmt->execute([
        $body['title'] ?? '',
        $body['categoryId'] ?? '',
        json_encode($body['steps'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($body['tagIds'] ?? [], JSON_UNESCAPED_UNICODE),
        $body['eyecatchPhotoId'] ?? null,
        $body['handwritingData'] ?? null,
        (int)($body['isFavorite'] ?? 0),
        $now,
        $id,
    ]);
    return getNote($db, $id);
}

function deleteNote(PDO $db, string $id): array
{
    $db->prepare("DELETE FROM sm_notes WHERE id = ?")->execute([$id]);
    return ['ok' => true];
}

function uploadPhoto(PDO $db, string $noteId, string $stepId): array
{
    if (empty($_FILES['photo'])) {
        error(400, 'No file uploaded');
        return [];
    }
    $file = $_FILES['photo'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
        error(400, 'Invalid file type');
        return [];
    }
    $filename = uuid() . '.' . $ext;
    move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $filename);
    return ['url' => '/contents/sm/api/uploads/' . $filename, 'filename' => $filename];
}
