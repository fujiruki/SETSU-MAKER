import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategoryTreeViewModel } from '../useCategoryTreeViewModel';
import type { Category } from '../../models/types';

const cats: Category[] = [
  { id: 'root-1', name: 'A',   parentId: null,      order: 0 },
  { id: 'root-2', name: 'B',   parentId: null,      order: 1 },
  { id: 'child-1',      name: 'A1',  parentId: 'root-1',  order: 0 },
  { id: 'child-2',      name: 'A2',  parentId: 'root-1',  order: 1 },
  { id: 'grandchild-1', name: 'A1a', parentId: 'child-1', order: 0 },
];

describe('useCategoryTreeViewModel', () => {
  describe('初期状態', () => {
    it('すべて折りたたまれている', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, undefined));
      expect(result.current.isExpanded('root-1')).toBe(false);
      expect(result.current.isExpanded('child-1')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('折りたたまれているノードをtoggleすると展開される', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, undefined));
      act(() => result.current.toggle('root-1'));
      expect(result.current.isExpanded('root-1')).toBe(true);
    });

    it('展開済みノードをtoggleすると折りたたまれる', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, undefined));
      act(() => result.current.toggle('root-1'));
      act(() => result.current.toggle('root-1'));
      expect(result.current.isExpanded('root-1')).toBe(false);
    });

    it('他ノードのtoggle状態は独立している', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, undefined));
      act(() => result.current.toggle('root-1'));
      expect(result.current.isExpanded('root-2')).toBe(false);
    });
  });

  describe('選択カテゴリの祖先自動展開', () => {
    it('子カテゴリを選択すると親が自動展開される', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, 'child-1'));
      expect(result.current.isExpanded('root-1')).toBe(true);
    });

    it('孫カテゴリを選択すると親・祖父がすべて自動展開される', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, 'grandchild-1'));
      expect(result.current.isExpanded('root-1')).toBe(true);
      expect(result.current.isExpanded('child-1')).toBe(true);
    });

    it('トップレベルカテゴリを選択しても余計な展開は起きない', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, 'root-1'));
      expect(result.current.isExpanded('root-2')).toBe(false);
    });

    it('選択カテゴリが変わると新しい祖先も自動展開される', () => {
      const { result, rerender } = renderHook(
        ({ selectedId }: { selectedId: string | undefined }) =>
          useCategoryTreeViewModel(cats, selectedId),
        { initialProps: { selectedId: undefined as string | undefined } }
      );
      expect(result.current.isExpanded('root-1')).toBe(false);
      rerender({ selectedId: 'grandchild-1' });
      expect(result.current.isExpanded('root-1')).toBe(true);
      expect(result.current.isExpanded('child-1')).toBe(true);
    });

    it('カテゴリリストがAPIから遅れて届いても祖先が正しく展開される（APIレース対策）', () => {
      // selectedId は先に決まるが categories はまだ空
      const { result, rerender } = renderHook(
        ({ categories, selectedId }: { categories: Category[]; selectedId: string | undefined }) =>
          useCategoryTreeViewModel(categories, selectedId),
        { initialProps: { categories: [] as Category[], selectedId: 'grandchild-1' } }
      );
      // カテゴリ未ロード時は展開不可
      expect(result.current.isExpanded('root-1')).toBe(false);

      // APIからカテゴリが届く
      rerender({ categories: cats, selectedId: 'grandchild-1' });
      expect(result.current.isExpanded('root-1')).toBe(true);
      expect(result.current.isExpanded('child-1')).toBe(true);
    });

    it('手動toggleと自動展開は共存できる', () => {
      const { result } = renderHook(() => useCategoryTreeViewModel(cats, 'grandchild-1'));
      // grandchild-1 により root-1, child-1 が展開済み
      act(() => result.current.toggle('root-2'));
      expect(result.current.isExpanded('root-1')).toBe(true);
      expect(result.current.isExpanded('child-1')).toBe(true);
      expect(result.current.isExpanded('root-2')).toBe(true);
    });
  });
});
