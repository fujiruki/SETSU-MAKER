import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoteEditorViewModel } from '../useNoteEditorViewModel';
import type { Note, Step } from '../../models/types';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  title: 'テストノート',
  categoryId: 'cat-1',
  tagIds: [],
  steps: [],
  eyecatchPhotoId: null,
  handwritingData: null,
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeStep = (overrides: Partial<Step> = {}): Step => ({
  id: 'step-1',
  order: 0,
  title: '',
  description: '',
  highlights: [],
  photos: [],
  hint: '',
  ...overrides,
});

describe('useNoteEditorViewModel', () => {
  describe('初期化', () => {
    it('渡されたnoteをdraftとして保持する', () => {
      const note = makeNote({ title: 'はじめてのノート' });
      const { result } = renderHook(() => useNoteEditorViewModel(note));
      expect(result.current.draft.title).toBe('はじめてのノート');
    });

    it('isDirtyは初期状態でfalse', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('タイトル変更', () => {
    it('タイトルを変更するとdraftに反映されisDirtyがtrueになる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.setTitle('新しいタイトル'));
      expect(result.current.draft.title).toBe('新しいタイトル');
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('タグ操作', () => {
    it('タグを追加できる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.addTag('tag-1'));
      expect(result.current.draft.tagIds).toContain('tag-1');
    });

    it('同じタグは重複追加されない', () => {
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ tagIds: ['tag-1'] }))
      );
      act(() => result.current.addTag('tag-1'));
      expect(result.current.draft.tagIds.filter((t) => t === 'tag-1').length).toBe(1);
    });

    it('タグを削除できる', () => {
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ tagIds: ['tag-1', 'tag-2'] }))
      );
      act(() => result.current.removeTag('tag-1'));
      expect(result.current.draft.tagIds).not.toContain('tag-1');
      expect(result.current.draft.tagIds).toContain('tag-2');
    });
  });

  describe('工程(Step)操作', () => {
    it('工程を追加するとstepsに追加される', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.addStep());
      expect(result.current.draft.steps.length).toBe(1);
    });

    it('複数工程追加時はorderが連番になる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => {
        result.current.addStep();
        result.current.addStep();
        result.current.addStep();
      });
      expect(result.current.draft.steps.map((s) => s.order)).toEqual([0, 1, 2]);
    });

    it('工程を削除できる', () => {
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps: [makeStep({ id: 'step-1' })] }))
      );
      act(() => result.current.removeStep('step-1'));
      expect(result.current.draft.steps.length).toBe(0);
    });

    it('工程のorderを入れ替えられる', () => {
      const steps = [
        makeStep({ id: 'a', order: 0 }),
        makeStep({ id: 'b', order: 1 }),
        makeStep({ id: 'c', order: 2 }),
      ];
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps }))
      );
      act(() => result.current.reorderSteps('a', 'c'));
      const ids = result.current.draft.steps.map((s) => s.id);
      expect(ids.indexOf('a')).toBeGreaterThan(ids.indexOf('c'));
    });

    it('工程のフィールドを更新できる', () => {
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps: [makeStep({ id: 'step-1' })] }))
      );
      act(() => result.current.updateStep('step-1', { title: '工程タイトル' }));
      expect(result.current.draft.steps[0].title).toBe('工程タイトル');
    });
  });

  describe('ハイライトブロック', () => {
    it('工程にハイライトを追加できる', () => {
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps: [makeStep({ id: 'step-1' })] }))
      );
      act(() => result.current.addHighlight('step-1', 'warning'));
      expect(result.current.draft.steps[0].highlights.length).toBe(1);
      expect(result.current.draft.steps[0].highlights[0].type).toBe('warning');
    });

    it('ハイライトを削除できる', () => {
      const step = makeStep({
        id: 'step-1',
        highlights: [{ id: 'h-1', type: 'warning', content: '注意' }],
      });
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps: [step] }))
      );
      act(() => result.current.removeHighlight('step-1', 'h-1'));
      expect(result.current.draft.steps[0].highlights.length).toBe(0);
    });
  });
});
