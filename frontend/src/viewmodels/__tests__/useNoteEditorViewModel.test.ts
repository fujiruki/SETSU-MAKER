import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoteEditorViewModel } from '../useNoteEditorViewModel';
import type { Note, Step, Photo } from '../../models/types';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  title: 'テストノート',
  categoryId: 'cat-1',
  tagIds: [],
  steps: [],
  unassignedPhotos: [],
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

  describe('カテゴリ変更', () => {
    it('setCategoryIdでdraft.categoryIdが更新されisDirtyがtrueになる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ categoryId: 'cat-1' })));
      act(() => result.current.setCategoryId('cat-2'));
      expect(result.current.draft.categoryId).toBe('cat-2');
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('reset', () => {
    it('resetでdraftが引数のノートに置き換わりisDirtyがfalseになる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ title: '元' })));
      act(() => result.current.setTitle('変更後'));
      expect(result.current.isDirty).toBe(true);

      const serverNote = makeNote({ title: 'サーバー値', categoryId: 'cat-99', updatedAt: '2026-03-20T00:00:00Z' });
      act(() => result.current.reset(serverNote));
      expect(result.current.draft.title).toBe('サーバー値');
      expect(result.current.draft.categoryId).toBe('cat-99');
      expect(result.current.isDirty).toBe(false);
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

  describe('写真削除', () => {
    const makePhoto = (overrides: Partial<Photo> = {}): Photo => ({
      id: 'photo-1',
      url: 'http://example.com/photo.jpg',
      annotations: [],
      cropRegion: null,
      takenAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      order: 0,
      ...overrides,
    });

    it('指定した写真が削除される', () => {
      const step = makeStep({
        id: 'step-1',
        photos: [makePhoto({ id: 'p1' }), makePhoto({ id: 'p2', order: 1 })],
      });
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps: [step] }))
      );
      act(() => result.current.removePhoto('step-1', 'p1'));
      expect(result.current.draft.steps[0].photos.length).toBe(1);
      expect(result.current.draft.steps[0].photos[0].id).toBe('p2');
    });

    it('他のステップの写真には影響しない', () => {
      const steps = [
        makeStep({ id: 's1', photos: [makePhoto({ id: 'p1' })], order: 0 }),
        makeStep({ id: 's2', photos: [makePhoto({ id: 'p2' })], order: 1 }),
      ];
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps }))
      );
      act(() => result.current.removePhoto('s1', 'p1'));
      expect(result.current.draft.steps[0].photos.length).toBe(0);
      expect(result.current.draft.steps[1].photos.length).toBe(1);
    });
  });

  describe('Undo', () => {
    it('canUndoは初期状態でfalse', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      expect(result.current.canUndo).toBe(false);
    });

    it('操作後にcanUndoがtrueになる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.setTitle('変更'));
      expect(result.current.canUndo).toBe(true);
    });

    it('undoで直前の状態に戻る', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ title: '元' })));
      act(() => result.current.setTitle('変更後'));
      expect(result.current.draft.title).toBe('変更後');

      act(() => result.current.undo());
      expect(result.current.draft.title).toBe('元');
    });

    it('複数操作後に連続undoで順番に戻る', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ title: 'A' })));
      act(() => result.current.setTitle('B'));
      act(() => result.current.setTitle('C'));
      act(() => result.current.setTitle('D'));

      act(() => result.current.undo());
      expect(result.current.draft.title).toBe('C');

      act(() => result.current.undo());
      expect(result.current.draft.title).toBe('B');

      act(() => result.current.undo());
      expect(result.current.draft.title).toBe('A');
    });

    it('history空の時undoしても何も起きない', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ title: '元' })));
      act(() => result.current.undo());
      expect(result.current.draft.title).toBe('元');
      expect(result.current.canUndo).toBe(false);
    });

    it('resetでhistoryがクリアされる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.setTitle('変更1'));
      act(() => result.current.setTitle('変更2'));
      expect(result.current.canUndo).toBe(true);

      act(() => result.current.reset(makeNote({ title: 'リセット' })));
      expect(result.current.canUndo).toBe(false);
    });

    it('revertでhistoryがクリアされる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.setTitle('変更'));
      expect(result.current.canUndo).toBe(true);

      act(() => result.current.revert());
      expect(result.current.canUndo).toBe(false);
    });

    it('undoで全て戻すとisDirtyがfalseになる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ title: '元' })));
      act(() => result.current.setTitle('変更'));
      expect(result.current.isDirty).toBe(true);

      act(() => result.current.undo());
      expect(result.current.isDirty).toBe(false);
    });

    it('写真削除後にundoで写真が復活する', () => {
      const photo: Photo = {
        id: 'p1', url: 'http://example.com/1.jpg', annotations: [],
        cropRegion: null, takenAt: null, createdAt: '2026-01-01T00:00:00Z', order: 0,
      };
      const step = makeStep({ id: 's1', photos: [photo] });
      const { result } = renderHook(() =>
        useNoteEditorViewModel(makeNote({ steps: [step] }))
      );
      act(() => result.current.removePhoto('s1', 'p1'));
      expect(result.current.draft.steps[0].photos.length).toBe(0);

      act(() => result.current.undo());
      expect(result.current.draft.steps[0].photos.length).toBe(1);
      expect(result.current.draft.steps[0].photos[0].id).toBe('p1');
    });
  });

  describe('アイキャッチ', () => {
    it('setEyecatchPhotoIdでアイキャッチを設定できる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.setEyecatchPhotoId('photo-1'));
      expect(result.current.draft.eyecatchPhotoId).toBe('photo-1');
      expect(result.current.isDirty).toBe(true);
    });

    it('setEyecatchPhotoId(null)でクリアできる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ eyecatchPhotoId: 'photo-1' })));
      act(() => result.current.setEyecatchPhotoId(null));
      expect(result.current.draft.eyecatchPhotoId).toBeNull();
    });

    it('getAllPhotosが全ステップ+未割り当ての写真をフラットに返す', () => {
      const p1: Photo = { id: 'p1', url: 'u1', annotations: [], cropRegion: null, takenAt: null, createdAt: '2026-01-01T00:00:00Z', order: 0 };
      const p2: Photo = { id: 'p2', url: 'u2', annotations: [], cropRegion: null, takenAt: null, createdAt: '2026-01-02T00:00:00Z', order: 0 };
      const p3: Photo = { id: 'p3', url: 'u3', annotations: [], cropRegion: null, takenAt: null, createdAt: '2026-01-03T00:00:00Z', order: 0 };
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({
        steps: [makeStep({ id: 's1', photos: [p1] }), makeStep({ id: 's2', photos: [p2], order: 1 })],
        unassignedPhotos: [p3],
      })));
      expect(result.current.getAllPhotos().map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
    });
  });

  describe('未割り当て写真プール', () => {
    const mkPhoto = (id: string, takenAt: string | null = null): Photo => ({
      id, url: `http://example.com/${id}.jpg`, annotations: [], cropRegion: null,
      takenAt, createdAt: '2026-01-01T00:00:00Z', order: 0,
    });

    it('addUnassignedPhotosでプールに追加される', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.addUnassignedPhotos([mkPhoto('p1'), mkPhoto('p2')]));
      expect(result.current.draft.unassignedPhotos.length).toBe(2);
    });

    it('takenAt順にソートされる', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.addUnassignedPhotos([
        mkPhoto('p1', '2026-01-03T00:00:00Z'),
        mkPhoto('p2', '2026-01-01T00:00:00Z'),
        mkPhoto('p3', '2026-01-02T00:00:00Z'),
      ]));
      expect(result.current.draft.unassignedPhotos.map(p => p.id)).toEqual(['p2', 'p3', 'p1']);
    });

    it('removeUnassignedPhotoでプールから削除される', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({
        unassignedPhotos: [mkPhoto('p1'), mkPhoto('p2')],
      })));
      act(() => result.current.removeUnassignedPhoto('p1'));
      expect(result.current.draft.unassignedPhotos.length).toBe(1);
      expect(result.current.draft.unassignedPhotos[0].id).toBe('p2');
    });

    it('assignPhotoToStepでプールからステップに移動する', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({
        steps: [makeStep({ id: 's1' })],
        unassignedPhotos: [mkPhoto('p1')],
      })));
      act(() => result.current.assignPhotoToStep('p1', 's1'));
      expect(result.current.draft.unassignedPhotos.length).toBe(0);
      expect(result.current.draft.steps[0].photos.length).toBe(1);
      expect(result.current.draft.steps[0].photos[0].id).toBe('p1');
    });

    it('createStepWithPhotoで新ステップ作成+写真割り当て', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote({
        unassignedPhotos: [mkPhoto('p1')],
      })));
      act(() => result.current.createStepWithPhoto('p1'));
      expect(result.current.draft.unassignedPhotos.length).toBe(0);
      expect(result.current.draft.steps.length).toBe(1);
      expect(result.current.draft.steps[0].photos.length).toBe(1);
      expect(result.current.draft.steps[0].photos[0].id).toBe('p1');
    });

    it('undoで未割り当て操作が巻き戻される', () => {
      const { result } = renderHook(() => useNoteEditorViewModel(makeNote()));
      act(() => result.current.addUnassignedPhotos([mkPhoto('p1')]));
      expect(result.current.draft.unassignedPhotos.length).toBe(1);

      act(() => result.current.undo());
      expect(result.current.draft.unassignedPhotos.length).toBe(0);
    });
  });

  describe('写真ドラッグ&ドロップ', () => {
    const mkPhoto = (id: string, takenAt: string | null = null, order = 0): Photo => ({
      id, url: `http://example.com/${id}.jpg`, annotations: [], cropRegion: null,
      takenAt, createdAt: '2026-01-01T00:00:00Z', order,
    });

    describe('movePhotoToStep - 工程間の写真移動', () => {
      it('工程Aから工程Bに写真が移動する', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1'), mkPhoto('p2', null, 1)] }),
          makeStep({ id: 's2', order: 1, photos: [] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToStep('p1', 's1', 's2'));
        expect(result.current.draft.steps[1].photos.map(p => p.id)).toContain('p1');
      });

      it('移動元の工程から写真が消える', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1'), mkPhoto('p2', null, 1)] }),
          makeStep({ id: 's2', order: 1, photos: [] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToStep('p1', 's1', 's2'));
        expect(result.current.draft.steps[0].photos.map(p => p.id)).not.toContain('p1');
        expect(result.current.draft.steps[0].photos.length).toBe(1);
      });

      it('移動先の工程の末尾に追加される', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1')] }),
          makeStep({ id: 's2', order: 1, photos: [mkPhoto('p2'), mkPhoto('p3', null, 1)] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToStep('p1', 's1', 's2'));
        const s2Photos = result.current.draft.steps[1].photos;
        expect(s2Photos[s2Photos.length - 1].id).toBe('p1');
      });

      it('fromとtoが同じ場合は何もしない', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1'), mkPhoto('p2', null, 1)] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToStep('p1', 's1', 's1'));
        expect(result.current.isDirty).toBe(false);
      });

      it('isDirtyがtrueになる', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1')] }),
          makeStep({ id: 's2', order: 1, photos: [] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToStep('p1', 's1', 's2'));
        expect(result.current.isDirty).toBe(true);
      });

      it('undoで元に戻る', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1')] }),
          makeStep({ id: 's2', order: 1, photos: [] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToStep('p1', 's1', 's2'));
        act(() => result.current.undo());
        expect(result.current.draft.steps[0].photos.map(p => p.id)).toContain('p1');
        expect(result.current.draft.steps[1].photos.length).toBe(0);
      });
    });

    describe('movePhotoToUnassigned - 工程から未割り当てプールへ戻す', () => {
      it('工程から未割り当てプールに写真が戻る', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1', '2026-01-02T00:00:00Z')] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToUnassigned('p1', 's1'));
        expect(result.current.draft.unassignedPhotos.map(p => p.id)).toContain('p1');
      });

      it('工程から写真が消える', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1'), mkPhoto('p2', null, 1)] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToUnassigned('p1', 's1'));
        expect(result.current.draft.steps[0].photos.map(p => p.id)).not.toContain('p1');
        expect(result.current.draft.steps[0].photos.length).toBe(1);
      });

      it('未割り当てプールにtakenAt順で追加される', () => {
        const existing: Photo[] = [
          mkPhoto('p-early', '2026-01-01T00:00:00Z'),
          mkPhoto('p-late', '2026-01-03T00:00:00Z'),
        ];
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p-mid', '2026-01-02T00:00:00Z')] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({
          steps,
          unassignedPhotos: existing,
        })));
        act(() => result.current.movePhotoToUnassigned('p-mid', 's1'));
        expect(result.current.draft.unassignedPhotos.map(p => p.id)).toEqual(['p-early', 'p-mid', 'p-late']);
      });

      it('undoで元に戻る', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1', '2026-01-01T00:00:00Z')] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.movePhotoToUnassigned('p1', 's1'));
        act(() => result.current.undo());
        expect(result.current.draft.steps[0].photos.map(p => p.id)).toContain('p1');
        expect(result.current.draft.unassignedPhotos.length).toBe(0);
      });
    });

    describe('reorderPhotosInStep - 工程内の写真並び替え', () => {
      it('工程内で写真の順序が変わる', () => {
        const photos = [mkPhoto('p1', null, 0), mkPhoto('p2', null, 1), mkPhoto('p3', null, 2)];
        const steps = [makeStep({ id: 's1', order: 0, photos })];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.reorderPhotosInStep('s1', 'p3', 'p1'));
        const ids = result.current.draft.steps[0].photos.map(p => p.id);
        expect(ids.indexOf('p3')).toBeLessThan(ids.indexOf('p1'));
      });

      it('orderが正しく振り直される', () => {
        const photos = [mkPhoto('p1', null, 0), mkPhoto('p2', null, 1), mkPhoto('p3', null, 2)];
        const steps = [makeStep({ id: 's1', order: 0, photos })];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.reorderPhotosInStep('s1', 'p3', 'p1'));
        const orders = result.current.draft.steps[0].photos.map(p => p.order);
        expect(orders).toEqual([0, 1, 2]);
      });

      it('他の工程には影響しない', () => {
        const steps = [
          makeStep({ id: 's1', order: 0, photos: [mkPhoto('p1', null, 0), mkPhoto('p2', null, 1)] }),
          makeStep({ id: 's2', order: 1, photos: [mkPhoto('p3', null, 0), mkPhoto('p4', null, 1)] }),
        ];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.reorderPhotosInStep('s1', 'p2', 'p1'));
        expect(result.current.draft.steps[1].photos.map(p => p.id)).toEqual(['p3', 'p4']);
      });

      it('undoで元に戻る', () => {
        const photos = [mkPhoto('p1', null, 0), mkPhoto('p2', null, 1), mkPhoto('p3', null, 2)];
        const steps = [makeStep({ id: 's1', order: 0, photos })];
        const { result } = renderHook(() => useNoteEditorViewModel(makeNote({ steps })));
        act(() => result.current.reorderPhotosInStep('s1', 'p3', 'p1'));
        act(() => result.current.undo());
        expect(result.current.draft.steps[0].photos.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
      });
    });
  });
});
