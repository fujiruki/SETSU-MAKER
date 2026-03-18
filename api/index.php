<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage/StorageInterface.php';
require_once __DIR__ . '/storage/SqliteStorage.php';
require_once __DIR__ . '/storage/FilesystemStorage.php';

if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$storage = STORAGE_MODE === 'filesystem' ? new FilesystemStorage() : new SqliteStorage();

$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path   = preg_replace('#^/contents/sm/api#', '', $path);
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

route($method, $path, $body, $storage);

// ─────────────────────────────────────────────────────────────
// ルーター
// ─────────────────────────────────────────────────────────────
function route(string $method, string $path, array $body, StorageInterface $s): void
{
    $parts = explode('/', trim($path, '/'));

    match (true) {
        $method === 'GET'  && $path === '/health'
            => smJson(['status' => 'ok', 'storage' => STORAGE_MODE]),

        $method === 'GET'  && $path === '/categories'
            => smJson($s->getCategories()),
        $method === 'POST' && $path === '/categories'
            => smJson($s->createCategory($body)),

        $method === 'GET'  && $path === '/tags'
            => smJson($s->getTags($_GET['q'] ?? '')),
        $method === 'POST' && $path === '/tags'
            => smJson($s->createTag($body['name'] ?? '')),

        $method === 'GET'  && $path === '/notes'
            => smJson($s->getNotes($_GET)),
        $method === 'POST' && $path === '/notes'
            => smJson($s->createNote($body)),

        $method === 'GET'    && preg_match('#^/notes/([^/]+)$#', $path, $m)
            => smJson($s->getNote($m[1]) ?: smError(404, 'Not Found')),
        $method === 'PUT'    && preg_match('#^/notes/([^/]+)$#', $path, $m)
            => smJson($s->updateNote($m[1], $body) ?: smError(404, 'Not Found')),
        $method === 'DELETE' && preg_match('#^/notes/([^/]+)$#', $path, $m)
            => smJson(['ok' => $s->deleteNote($m[1])]),

        $method === 'POST' && preg_match('#^/notes/([^/]+)/steps/([^/]+)/photos$#', $path, $m)
            => smJson(uploadPhoto($m[1], $m[2])),

        default => smError(404, 'Not Found'),
    };
}

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────
function smJson(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
}

function smError(int $status, string $message): void
{
    smJson(['error' => $message], $status);
    exit;
}

function smUuid(): string
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

function smNow(): string
{
    return date('c');
}

// ─────────────────────────────────────────────────────────────
// 画像アップロード（両モード共通: uploads/{noteId}/ に保存）
// ─────────────────────────────────────────────────────────────
function uploadPhoto(string $noteId, string $stepId): array
{
    if (empty($_FILES['photo'])) { smError(400, 'No file uploaded'); return []; }

    $file = $_FILES['photo'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
        smError(400, 'Invalid file type');
        return [];
    }

    $noteDir = UPLOAD_DIR . $noteId . '/';
    if (!is_dir($noteDir)) mkdir($noteDir, 0755, true);

    $takenAt   = null;
    $timestamp = date('Ymd_His');

    if (in_array($ext, ['jpg', 'jpeg']) && function_exists('exif_read_data')) {
        $exif = @exif_read_data($file['tmp_name']);
        if (!empty($exif['DateTimeOriginal'])) {
            $dt = DateTime::createFromFormat('Y:m:d H:i:s', $exif['DateTimeOriginal']);
            if ($dt) {
                $takenAt   = $dt->format('c');
                $timestamp = $dt->format('Ymd_His');
            }
        }
    }

    $filename = $timestamp . '_' . substr(md5(uniqid()), 0, 6) . '.' . $ext;
    move_uploaded_file($file['tmp_name'], $noteDir . $filename);

    // filesystem モード時はノートフォルダにもコピーして co-location を実現
    if (STORAGE_MODE === 'filesystem') {
        $fsDir = DATA_DIR . 'notes/' . $noteId . '/';
        if (!is_dir($fsDir)) mkdir($fsDir, 0755, true);
        copy($noteDir . $filename, $fsDir . $filename);
    }

    return [
        'url'      => '/contents/sm/api/uploads/' . $noteId . '/' . $filename,
        'filename' => $filename,
        'takenAt'  => $takenAt,
    ];
}
