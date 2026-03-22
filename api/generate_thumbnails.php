<?php
/**
 * 既存画像のサムネイル一括生成 + ノートデータへの thumbnailUrl 自動付与
 *
 * 実行方法:
 *   php generate_thumbnails.php
 *   または GET /api/generate_thumbnails.php?key=sm_gen_thumb_2026
 */
declare(strict_types=1);

$SECRET_KEY = 'sm_gen_thumb_2026';
if (php_sapi_name() !== 'cli') {
    if (($_GET['key'] ?? '') !== $SECRET_KEY) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
}

require_once __DIR__ . '/config.php';

$THUMB_MAX = 480;
$imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

$stats = ['scanned' => 0, 'created' => 0, 'skipped' => 0, 'errors' => 0, 'notes_updated' => 0];

// Step 1: uploads/ 内の画像からサムネイル生成
$notesDirs = glob(UPLOAD_DIR . '*', GLOB_ONLYDIR);
foreach ($notesDirs as $noteDir) {
    $files = scandir($noteDir);
    $thumbDir = $noteDir . '/thumb/';

    foreach ($files as $file) {
        if ($file === '.' || $file === '..' || $file === 'thumb') continue;
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($ext, $imageExts)) continue;

        $stats['scanned']++;
        $srcPath = $noteDir . '/' . $file;
        $thumbName = pathinfo($file, PATHINFO_FILENAME) . '_thumb.jpg';
        $thumbPath = $thumbDir . $thumbName;

        if (file_exists($thumbPath) && filesize($thumbPath) > 0) {
            $stats['skipped']++;
            continue;
        }

        if (!is_dir($thumbDir)) mkdir($thumbDir, 0755, true);

        if (createThumbnail($srcPath, $thumbPath, $THUMB_MAX)) {
            $stats['created']++;
        } else {
            $stats['errors']++;
        }
    }
}

// Step 2: SQLite DB 内のノートデータに thumbnailUrl を付与
if (STORAGE_MODE === 'sqlite' && file_exists(DB_PATH)) {
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $rows = $db->query("SELECT id, steps_json, unassigned_photos_json FROM sm_notes")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        $steps = json_decode($row['steps_json'], true) ?? [];
        $unassigned = json_decode($row['unassigned_photos_json'], true) ?? [];
        $changed = false;

        foreach ($steps as &$step) {
            foreach ($step['photos'] ?? [] as &$photo) {
                if (addThumbnailUrl($photo, $row['id'])) $changed = true;
            }
        }
        foreach ($unassigned as &$photo) {
            if (addThumbnailUrl($photo, $row['id'])) $changed = true;
        }

        if ($changed) {
            $stmt = $db->prepare("UPDATE sm_notes SET steps_json = ?, unassigned_photos_json = ? WHERE id = ?");
            $stmt->execute([
                json_encode($steps, JSON_UNESCAPED_UNICODE),
                json_encode($unassigned, JSON_UNESCAPED_UNICODE),
                $row['id'],
            ]);
            $stats['notes_updated']++;
        }
    }
}

$result = [
    'status' => 'done',
    'stats' => $stats,
];

if (php_sapi_name() === 'cli') {
    echo "Scanned: {$stats['scanned']}, Created: {$stats['created']}, Skipped: {$stats['skipped']}, Errors: {$stats['errors']}, Notes updated: {$stats['notes_updated']}\n";
} else {
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

// ─────────────────────────────────────────────────────────────

function addThumbnailUrl(array &$photo, string $noteId): bool
{
    if (!empty($photo['thumbnailUrl'])) return false;
    $url = $photo['url'] ?? '';
    if (!$url) return false;

    // 動画はスキップ
    if (($photo['mediaType'] ?? '') === 'video') return false;

    $filename = basename($url);
    $thumbName = pathinfo($filename, PATHINFO_FILENAME) . '_thumb.jpg';
    $thumbPath = UPLOAD_DIR . $noteId . '/thumb/' . $thumbName;

    if (!file_exists($thumbPath)) return false;

    $photo['thumbnailUrl'] = '/contents/sm/api/uploads/' . $noteId . '/thumb/' . $thumbName;
    return true;
}

function createThumbnail(string $srcPath, string $dstPath, int $maxSize): bool
{
    $info = @getimagesize($srcPath);
    if (!$info) return false;

    [$origW, $origH, $type] = $info;
    if ($origW <= $maxSize && $origH <= $maxSize) {
        // 元画像が小さければそのままコピー（JPEG変換）
        $src = loadImage($srcPath, $type);
        if (!$src) return false;
        $ok = imagejpeg($src, $dstPath, 80);
        imagedestroy($src);
        return $ok;
    }

    $ratio = min($maxSize / $origW, $maxSize / $origH);
    $newW = (int)round($origW * $ratio);
    $newH = (int)round($origH * $ratio);

    $src = loadImage($srcPath, $type);
    if (!$src) return false;

    $dst = imagecreatetruecolor($newW, $newH);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
    $ok = imagejpeg($dst, $dstPath, 80);

    imagedestroy($src);
    imagedestroy($dst);
    return $ok;
}

function loadImage(string $path, int $type): GdImage|false
{
    return match ($type) {
        IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
        IMAGETYPE_PNG  => @imagecreatefrompng($path),
        IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        IMAGETYPE_GIF  => @imagecreatefromgif($path),
        default        => false,
    };
}
