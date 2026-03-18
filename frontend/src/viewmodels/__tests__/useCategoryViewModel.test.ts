import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategoryViewModel } from '../useCategoryViewModel';
import type { Category } from '../../models/types';
import type { CategoryRepository } from '../../repositories/types';

const makeRepo = (overrides: Partial<CategoryRepository> = {}): CategoryRepository => ({
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockImplementation(async (name, parentId) => ({
    id: 'new-cat',
    name,
    parentId: parentId ?? null,
    order: 0,
  })),
  update: vi.fn().mockImplementation(async (id, name) => ({ id, name, parentId: null, order: 0 })),
  delete: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const cats: Category[] = [
  { id: 'cat-1', name: '建具', parentId: null, order: 0 },
  { id: 'cat-2', name: '引き戸', parentId: 'cat-1', order: 0 },
  { id: 'cat-3', name: '障子', parentId: 'cat-1', order: 1 },
];

describe('useCategoryViewModel', () => {
  it('初期化でcategoriesを取得する', async () => {
    const repo = makeRepo({ getAll: vi.fn().mockResolvedValue(cats) });
    const { result } = renderHook(() => useCategoryViewModel(repo));
    await act(async () => {});
    expect(result.current.categories.length).toBe(3);
  });

  it('childrenOf で指定parentの子カテゴリを返す', async () => {
    const repo = makeRepo({ getAll: vi.fn().mockResolvedValue(cats) });
    const { result } = renderHook(() => useCategoryViewModel(repo));
    await act(async () => {});
    expect(result.current.childrenOf('cat-1').length).toBe(2);
    expect(result.current.childrenOf(null).length).toBe(1);
  });

  it('breadcrumbOf でパスを返す', async () => {
    const repo = makeRepo({ getAll: vi.fn().mockResolvedValue(cats) });
    const { result } = renderHook(() => useCategoryViewModel(repo));
    await act(async () => {});
    const path = result.current.breadcrumbOf('cat-2');
    expect(path.map((c) => c.name)).toEqual(['建具', '引き戸']);
  });
});
