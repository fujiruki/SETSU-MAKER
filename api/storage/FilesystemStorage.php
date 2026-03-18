<?php
/**
 * ファイルシステムストレージ
 *
 * data/
 *   categories.json
 *   tags.json
 *   notes/
 *     {noteId}/
 *       note.json   ← ノートの全データ
 *       *.jpg/png   ← アップロード画像（uploads/{noteId}/ とは別に co-location）
 */
class FilesystemStorage implements StorageInterface
{
    private string $notesDir;
    private string $categoriesFile;
    private string $tagsFile;

    public function __construct()
    {
        $this->notesDir       = DATA_DIR . 'notes/';
        $this->categoriesFile = DATA_DIR . 'categories.json';
        $this->tagsFile       = DATA_DIR . 'tags.json';

        foreach ([DATA_DIR, $this->notesDir] as $dir) {
            if (!is_dir($dir)) mkdir($dir, 0755, true);
        }
        foreach ([$this->categoriesFile, $this->tagsFile] as $file) {
            if (!file_exists($file)) file_put_contents($file, '[]');
        }
    }

    private function readJson(string $path): array
    {
        $content = file_get_contents($path);
        return json_decode($content ?: '[]', true) ?? [];
    }

    private function writeJson(string $path, mixed $data): void
    {
        file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }

    private function noteDir(string $id): string
    {
        return $this->notesDir . $id . '/';
    }

    private function noteFile(string $id): string
    {
        return $this->noteDir($id) . 'note.json';
    }

    public function getCategories(): array
    {
        return $this->readJson($this->categoriesFile);
    }

    public function createCategory(array $body): array
    {
        $cats = $this->readJson($this->categoriesFile);
        $cat  = [
            'id'       => smUuid(),
            'name'     => $body['name']     ?? '',
            'parentId' => $body['parentId'] ?? null,
            'order'    => (int)($body['order'] ?? count($cats)),
        ];
        $cats[] = $cat;
        $this->writeJson($this->categoriesFile, $cats);
        return $cat;
    }

    public function getTags(string $q = ''): array
    {
        $tags = $this->readJson($this->tagsFile);
        if ($q !== '') {
            $tags = array_values(array_filter($tags, fn($t) => str_contains($t['name'], $q)));
        }
        return array_slice($tags, 0, 100);
    }

    public function createTag(string $name): array
    {
        $tags     = $this->readJson($this->tagsFile);
        $existing = array_values(array_filter($tags, fn($t) => $t['name'] === $name));
        if ($existing) return $existing[0];
        $tag    = ['id' => smUuid(), 'name' => $name];
        $tags[] = $tag;
        $this->writeJson($this->tagsFile, $tags);
        return $tag;
    }

    public function getNotes(array $params): array
    {
        $notes = [];
        if (!is_dir($this->notesDir)) return [];
        foreach (glob($this->notesDir . '*/note.json') as $file) {
            $note = $this->readJson($file);
            if (!$note) continue;

            if (!empty($params['categoryId']) && ($note['categoryId'] ?? '') !== $params['categoryId']) continue;
            if (!empty($params['favorite'])   && !($note['isFavorite'] ?? false)) continue;
            if (!empty($params['q'])          && !str_contains($note['title'] ?? '', $params['q'])) continue;

            $notes[] = [
                'id'          => $note['id'],
                'title'       => $note['title'],
                'categoryId'  => $note['categoryId'],
                'tagIds'      => $note['tagIds'] ?? [],
                'eyecatchUrl' => null,
                'isFavorite'  => (bool)($note['isFavorite'] ?? false),
                'createdAt'   => $note['createdAt'],
                'updatedAt'   => $note['updatedAt'],
            ];
        }
        usort($notes, fn($a, $b) => strcmp($b['updatedAt'], $a['updatedAt']));
        return array_slice($notes, 0, 100);
    }

    public function getNote(string $id): array|false
    {
        $file = $this->noteFile($id);
        if (!file_exists($file)) return false;
        return $this->readJson($file);
    }

    public function createNote(array $body): array
    {
        $id  = smUuid();
        $now = smNow();
        $dir = $this->noteDir($id);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $note = [
            'id'              => $id,
            'title'           => $body['title']      ?? '',
            'categoryId'      => $body['categoryId'] ?? '',
            'tagIds'          => [],
            'steps'           => [],
            'eyecatchPhotoId' => null,
            'handwritingData' => null,
            'isFavorite'      => false,
            'createdAt'       => $now,
            'updatedAt'       => $now,
        ];
        $this->writeJson($this->noteFile($id), $note);
        return $note;
    }

    public function updateNote(string $id, array $body): array|false
    {
        $dir = $this->noteDir($id);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $existing = $this->getNote($id);
        $now      = smNow();
        $note     = array_merge($existing ?: [], [
            'id'              => $id,
            'title'           => $body['title']            ?? '',
            'categoryId'      => $body['categoryId']       ?? '',
            'tagIds'          => $body['tagIds']           ?? [],
            'steps'           => $body['steps']            ?? [],
            'eyecatchPhotoId' => $body['eyecatchPhotoId']  ?? null,
            'handwritingData' => $body['handwritingData']  ?? null,
            'isFavorite'      => (bool)($body['isFavorite'] ?? false),
            'updatedAt'       => $now,
        ]);
        $this->writeJson($this->noteFile($id), $note);
        return $note;
    }

    public function deleteNote(string $id): bool
    {
        $dir = $this->noteDir($id);
        if (is_dir($dir)) {
            array_map('unlink', glob($dir . '*'));
            rmdir($dir);
        }
        return true;
    }
}
