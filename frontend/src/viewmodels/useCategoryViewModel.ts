import { useState, useEffect, useCallback } from 'react';
import type { Category } from '../models/types';
import type { CategoryRepository } from '../repositories/types';

export function useCategoryViewModel(repo: CategoryRepository) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repo.getAll();
      setCategories(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => { load(); }, [load]);

  const childrenOf = useCallback(
    (parentId: string | null) =>
      categories.filter((c) => c.parentId === parentId).sort((a, b) => a.order - b.order),
    [categories]
  );

  const breadcrumbOf = useCallback(
    (categoryId: string): Category[] => {
      const path: Category[] = [];
      let current = categories.find((c) => c.id === categoryId);
      while (current) {
        path.unshift(current);
        current = current.parentId
          ? categories.find((c) => c.id === current!.parentId)
          : undefined;
      }
      return path;
    },
    [categories]
  );

  const createCategory = useCallback(
    async (name: string, parentId: string | null) => {
      const created = await repo.create(name, parentId);
      setCategories((prev) => [...prev, created]);
      return created;
    },
    [repo]
  );

  const updateCategory = useCallback(
    async (id: string, patch: { name?: string; parentId?: string | null }) => {
      const updated = await repo.update(id, patch);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [repo]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    },
    [repo]
  );

  return {
    categories,
    loading,
    error,
    childrenOf,
    breadcrumbOf,
    createCategory,
    updateCategory,
    deleteCategory,
    reload: load,
  };
}
