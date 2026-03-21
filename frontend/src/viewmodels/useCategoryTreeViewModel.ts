import { useState, useEffect, useCallback } from 'react';
import type { Category } from '../models/types';

export function useCategoryTreeViewModel(categories: Category[], selectedId: string | undefined) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const getAncestors = useCallback(
    (id: string): string[] => {
      const ancestors: string[] = [];
      let current = categories.find((c) => c.id === id);
      while (current?.parentId) {
        ancestors.push(current.parentId);
        current = categories.find((c) => c.id === current!.parentId);
      }
      return ancestors;
    },
    [categories]
  );

  useEffect(() => {
    if (!selectedId || categories.length === 0) return;
    const ancestors = getAncestors(selectedId);
    if (ancestors.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedId, getAncestors, categories]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  return { expandedIds, toggle, isExpanded };
}
