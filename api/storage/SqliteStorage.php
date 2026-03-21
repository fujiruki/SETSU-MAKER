<?php
class SqliteStorage implements StorageInterface
{
    private PDO $db;

    public function __construct()
    {
        $this->db = new PDO('sqlite:' . DB_PATH);
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $this->db->exec('PRAGMA journal_mode=WAL');
        $this->migrate();
    }

    private function migrate(): void
    {
        $this->db->exec("
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
        $this->ensureDefaultCategory();
        $this->addColumnIfMissing('sm_notes', 'unassigned_photos_json', "TEXT NOT NULL DEFAULT '[]'");
    }

    private function addColumnIfMissing(string $table, string $column, string $type): void
    {
        $cols = $this->db->query("PRAGMA table_info($table)")->fetchAll();
        foreach ($cols as $col) {
            if ($col['name'] === $column) return;
        }
        $this->db->exec("ALTER TABLE $table ADD COLUMN $column $type");
    }

    private function ensureDefaultCategory(): void
    {
        $stmt = $this->db->prepare("SELECT id FROM sm_categories WHERE id = ?");
        $stmt->execute([UNCATEGORIZED_ID]);
        if (!$stmt->fetch()) {
            $this->db->prepare(
                "INSERT INTO sm_categories (id, name, parent_id, sort_order, created_at) VALUES (?, '未分類', NULL, 999999, ?)"
            )->execute([UNCATEGORIZED_ID, smNow()]);
        }
    }

    public function getCategories(): array
    {
        $rows = $this->db->query(
            "SELECT id, name, parent_id as parentId, sort_order as \"order\" FROM sm_categories ORDER BY sort_order"
        )->fetchAll();
        return array_map(fn($r) => [
            'id'       => $r['id'],
            'name'     => $r['name'],
            'parentId' => $r['parentId'],
            'order'    => (int)$r['order'],
        ], $rows);
    }

    public function createCategory(array $body): array
    {
        $id       = smUuid();
        $name     = $body['name'] ?? '';
        $parentId = $body['parentId'] ?? null;
        $order    = (int)($body['order'] ?? 0);
        $now      = smNow();
        $this->db->prepare(
            "INSERT INTO sm_categories (id, name, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?)"
        )->execute([$id, $name, $parentId, $order, $now]);
        return ['id' => $id, 'name' => $name, 'parentId' => $parentId, 'order' => $order];
    }

    public function updateCategory(string $id, array $body): array|false
    {
        if ($id === UNCATEGORIZED_ID) { smError(400, 'Cannot modify default category'); return false; }
        $stmt = $this->db->prepare("SELECT * FROM sm_categories WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return false;
        $name     = $body['name']     ?? $row['name'];
        $parentId = array_key_exists('parentId', $body) ? $body['parentId'] : $row['parent_id'];
        $this->db->prepare("UPDATE sm_categories SET name=?, parent_id=? WHERE id=?")
                 ->execute([$name, $parentId, $id]);
        return ['id' => $id, 'name' => $name, 'parentId' => $parentId, 'order' => (int)$row['sort_order']];
    }

    public function deleteCategory(string $id): bool
    {
        if ($id === UNCATEGORIZED_ID) { smError(400, 'Cannot delete default category'); return false; }
        $this->db->prepare("DELETE FROM sm_categories WHERE id = ?")->execute([$id]);
        return true;
    }

    public function getTags(string $q = ''): array
    {
        if ($q !== '') {
            $stmt = $this->db->prepare("SELECT id, name FROM sm_tags WHERE name LIKE ? ORDER BY name LIMIT 20");
            $stmt->execute(['%' . $q . '%']);
        } else {
            $stmt = $this->db->query("SELECT id, name FROM sm_tags ORDER BY name");
        }
        return $stmt->fetchAll();
    }

    public function createTag(string $name): array
    {
        $id  = smUuid();
        $now = smNow();
        $this->db->prepare("INSERT OR IGNORE INTO sm_tags (id, name, created_at) VALUES (?, ?, ?)")
                 ->execute([$id, $name, $now]);
        $stmt = $this->db->prepare("SELECT id, name FROM sm_tags WHERE name = ?");
        $stmt->execute([$name]);
        return $stmt->fetch();
    }

    public function getNotes(array $params): array
    {
        $where = [];
        $binds = [];
        if (!empty($params['categoryId'])) { $where[] = 'category_id = ?'; $binds[] = $params['categoryId']; }
        if (!empty($params['favorite']))   { $where[] = 'is_favorite = 1'; }
        if (!empty($params['q']))          { $where[] = 'title LIKE ?'; $binds[] = '%' . $params['q'] . '%'; }

        $sql = "SELECT id, title, category_id as categoryId, tag_ids_json, eyecatch_photo_id, steps_json, unassigned_photos_json, is_favorite, created_at, updated_at FROM sm_notes";
        if ($where) { $sql .= ' WHERE ' . implode(' AND ', $where); }
        $sql .= ' ORDER BY updated_at DESC LIMIT 100';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($binds);
        return array_map(fn($r) => [
            'id'          => $r['id'],
            'title'       => $r['title'],
            'categoryId'  => $r['categoryId'],
            'tagIds'      => json_decode($r['tag_ids_json'], true),
            'eyecatchUrl' => resolveEyecatchUrl(
                $r['eyecatch_photo_id'],
                json_decode($r['steps_json'], true) ?? [],
                json_decode($r['unassigned_photos_json'], true) ?? []
            ),
            'isFavorite'  => (bool)$r['is_favorite'],
            'createdAt'   => $r['created_at'],
            'updatedAt'   => $r['updated_at'],
        ], $stmt->fetchAll());
    }

    public function getNote(string $id): array|false
    {
        $stmt = $this->db->prepare("SELECT * FROM sm_notes WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return false;
        return [
            'id'               => $row['id'],
            'title'            => $row['title'],
            'categoryId'       => $row['category_id'],
            'tagIds'           => json_decode($row['tag_ids_json'], true),
            'steps'            => json_decode($row['steps_json'], true),
            'unassignedPhotos' => json_decode($row['unassigned_photos_json'] ?? '[]', true),
            'eyecatchPhotoId'  => $row['eyecatch_photo_id'],
            'handwritingData'  => $row['handwriting_data'],
            'isFavorite'       => (bool)$row['is_favorite'],
            'createdAt'        => $row['created_at'],
            'updatedAt'        => $row['updated_at'],
        ];
    }

    public function createNote(array $body): array
    {
        $id  = smUuid();
        $now = smNow();
        $this->db->prepare(
            "INSERT INTO sm_notes (id, title, category_id, steps_json, tag_ids_json, unassigned_photos_json, is_favorite, created_at, updated_at)
             VALUES (?, ?, ?, '[]', '[]', '[]', 0, ?, ?)"
        )->execute([$id, $body['title'] ?? '', $body['categoryId'] ?? '', $now, $now]);
        return $this->getNote($id);
    }

    public function updateNote(string $id, array $body): array|false
    {
        $now = smNow();
        $this->db->prepare(
            "UPDATE sm_notes SET title=?, category_id=?, steps_json=?, tag_ids_json=?, unassigned_photos_json=?,
             eyecatch_photo_id=?, handwriting_data=?, is_favorite=?, updated_at=? WHERE id=?"
        )->execute([
            $body['title']            ?? '',
            $body['categoryId']       ?? '',
            json_encode($body['steps']  ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($body['tagIds'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($body['unassignedPhotos'] ?? [], JSON_UNESCAPED_UNICODE),
            $body['eyecatchPhotoId']  ?? null,
            $body['handwritingData']  ?? null,
            (int)($body['isFavorite'] ?? 0),
            $now,
            $id,
        ]);
        return $this->getNote($id);
    }

    public function deleteNote(string $id): bool
    {
        $this->db->prepare("DELETE FROM sm_notes WHERE id = ?")->execute([$id]);
        return true;
    }
}
