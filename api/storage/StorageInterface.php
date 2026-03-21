<?php
interface StorageInterface
{
    public function getCategories(): array;
    public function createCategory(array $body): array;
    public function updateCategory(string $id, array $body): array|false;
    public function deleteCategory(string $id): bool;

    public function getTags(string $q = ''): array;
    public function createTag(string $name): array;

    public function getNotes(array $params): array;
    public function getNote(string $id): array|false;
    public function createNote(array $body): array;
    public function updateNote(string $id, array $body): array|false;
    public function deleteNote(string $id): bool;
}
