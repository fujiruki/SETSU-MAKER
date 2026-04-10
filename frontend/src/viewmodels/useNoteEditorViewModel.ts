import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { Note, Step, Photo, HighlightType } from '../models/types';

export function useNoteEditorViewModel(initialNote: Note) {
  const [draft, setDraft] = useState<Note>(initialNote);
  const [isDirty, setIsDirty] = useState(false);
  const [history, setHistory] = useState<Note[]>([]);

  const mutate = useCallback((updater: (prev: Note) => Note) => {
    setDraft((prev) => {
      setHistory((h) => [...h, prev]);
      return updater(prev);
    });
    setIsDirty(true);
  }, []);

  const setTitle = useCallback(
    (title: string) => mutate((n) => ({ ...n, title })),
    [mutate]
  );

  const setCategoryId = useCallback(
    (categoryId: string) => mutate((n) => ({ ...n, categoryId })),
    [mutate]
  );

  const addTag = useCallback(
    (tagId: string) =>
      mutate((n) =>
        n.tagIds.includes(tagId) ? n : { ...n, tagIds: [...n.tagIds, tagId] }
      ),
    [mutate]
  );

  const removeTag = useCallback(
    (tagId: string) =>
      mutate((n) => ({ ...n, tagIds: n.tagIds.filter((id) => id !== tagId) })),
    [mutate]
  );

  const addStep = useCallback(
    () =>
      mutate((n) => {
        const order = n.steps.length;
        const step: Step = {
          id: uuid(),
          order,
          title: '',
          description: '',
          highlights: [],
          photos: [],
          hint: '',
        };
        return { ...n, steps: [...n.steps, step] };
      }),
    [mutate]
  );

  const insertStep = useCallback(
    (afterIndex: number) =>
      mutate((n) => {
        const newStep: Step = {
          id: uuid(),
          order: afterIndex + 1,
          title: '',
          description: '',
          highlights: [],
          photos: [],
          hint: '',
        };
        const next = [
          ...n.steps.slice(0, afterIndex + 1),
          newStep,
          ...n.steps.slice(afterIndex + 1),
        ].map((s, i) => ({ ...s, order: i }));
        return { ...n, steps: next };
      }),
    [mutate]
  );

  const removeStep = useCallback(
    (stepId: string) =>
      mutate((n) => ({
        ...n,
        steps: n.steps
          .filter((s) => s.id !== stepId)
          .map((s, i) => ({ ...s, order: i })),
      })),
    [mutate]
  );

  const reorderSteps = useCallback(
    (draggedId: string, targetId: string) =>
      mutate((n) => {
        const steps = [...n.steps];
        const fromIdx = steps.findIndex((s) => s.id === draggedId);
        const toIdx = steps.findIndex((s) => s.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return n;
        const [item] = steps.splice(fromIdx, 1);
        steps.splice(toIdx, 0, item);
        return { ...n, steps: steps.map((s, i) => ({ ...s, order: i })) };
      }),
    [mutate]
  );

  const updateStep = useCallback(
    (stepId: string, patch: Partial<Step>) =>
      mutate((n) => ({
        ...n,
        steps: n.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
      })),
    [mutate]
  );

  const addHighlight = useCallback(
    (stepId: string, type: HighlightType) =>
      mutate((n) => ({
        ...n,
        steps: n.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                highlights: [
                  ...s.highlights,
                  { id: uuid(), type, content: '' },
                ],
              }
            : s
        ),
      })),
    [mutate]
  );

  const updateHighlight = useCallback(
    (stepId: string, highlightId: string, content: string) =>
      mutate((n) => ({
        ...n,
        steps: n.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                highlights: s.highlights.map((h) =>
                  h.id === highlightId ? { ...h, content } : h
                ),
              }
            : s
        ),
      })),
    [mutate]
  );

  const removeHighlight = useCallback(
    (stepId: string, highlightId: string) =>
      mutate((n) => ({
        ...n,
        steps: n.steps.map((s) =>
          s.id === stepId
            ? { ...s, highlights: s.highlights.filter((h) => h.id !== highlightId) }
            : s
        ),
      })),
    [mutate]
  );

  const removePhoto = useCallback(
    (stepId: string, photoId: string) =>
      mutate((n) => ({
        ...n,
        steps: n.steps.map((s) =>
          s.id === stepId
            ? { ...s, photos: s.photos.filter((p) => p.id !== photoId) }
            : s
        ),
      })),
    [mutate]
  );

  const setEyecatchPhotoId = useCallback(
    (photoId: string | null) => mutate((n) => ({ ...n, eyecatchPhotoId: photoId })),
    [mutate]
  );

  const getAllPhotos = useCallback((): Photo[] => {
    const photos: Photo[] = [];
    for (const step of draft.steps) {
      photos.push(...step.photos);
    }
    photos.push(...draft.unassignedPhotos);
    return photos;
  }, [draft.steps, draft.unassignedPhotos]);

  const addUnassignedPhotos = useCallback(
    (photos: Photo[]) =>
      mutate((n) => {
        const merged = [...n.unassignedPhotos, ...photos].sort((a, b) =>
          (a.takenAt ?? a.createdAt).localeCompare(b.takenAt ?? b.createdAt)
        );
        return { ...n, unassignedPhotos: merged };
      }),
    [mutate]
  );

  const removeUnassignedPhoto = useCallback(
    (photoId: string) =>
      mutate((n) => ({
        ...n,
        unassignedPhotos: n.unassignedPhotos.filter((p) => p.id !== photoId),
      })),
    [mutate]
  );

  const assignPhotoToStep = useCallback(
    (photoId: string, stepId: string) =>
      mutate((n) => {
        const photo = n.unassignedPhotos.find((p) => p.id === photoId);
        if (!photo) return n;
        return {
          ...n,
          unassignedPhotos: n.unassignedPhotos.filter((p) => p.id !== photoId),
          steps: n.steps.map((s) =>
            s.id === stepId ? { ...s, photos: [...s.photos, photo] } : s
          ),
        };
      }),
    [mutate]
  );

  const movePhotoToStep = useCallback(
    (photoId: string, fromStepId: string, toStepId: string) => {
      if (fromStepId === toStepId) return;
      mutate((n) => {
        const fromStep = n.steps.find((s) => s.id === fromStepId);
        const photo = fromStep?.photos.find((p) => p.id === photoId);
        if (!photo) return n;
        return {
          ...n,
          steps: n.steps.map((s) => {
            if (s.id === fromStepId) return { ...s, photos: s.photos.filter((p) => p.id !== photoId) };
            if (s.id === toStepId) return { ...s, photos: [...s.photos, photo] };
            return s;
          }),
        };
      });
    },
    [mutate]
  );

  const movePhotoToUnassigned = useCallback(
    (photoId: string, fromStepId: string) =>
      mutate((n) => {
        const fromStep = n.steps.find((s) => s.id === fromStepId);
        const photo = fromStep?.photos.find((p) => p.id === photoId);
        if (!photo) return n;
        const merged = [...n.unassignedPhotos, photo].sort((a, b) =>
          (a.takenAt ?? a.createdAt).localeCompare(b.takenAt ?? b.createdAt)
        );
        return {
          ...n,
          steps: n.steps.map((s) =>
            s.id === fromStepId ? { ...s, photos: s.photos.filter((p) => p.id !== photoId) } : s
          ),
          unassignedPhotos: merged,
        };
      }),
    [mutate]
  );

  const reorderPhotosInStep = useCallback(
    (stepId: string, draggedPhotoId: string, targetPhotoId: string) =>
      mutate((n) => ({
        ...n,
        steps: n.steps.map((s) => {
          if (s.id !== stepId) return s;
          const photos = [...s.photos];
          const fromIdx = photos.findIndex((p) => p.id === draggedPhotoId);
          const toIdx = photos.findIndex((p) => p.id === targetPhotoId);
          if (fromIdx === -1 || toIdx === -1) return s;
          const [item] = photos.splice(fromIdx, 1);
          photos.splice(toIdx, 0, item);
          return { ...s, photos: photos.map((p, i) => ({ ...p, order: i })) };
        }),
      })),
    [mutate]
  );

  const createStepWithPhoto = useCallback(
    (photoId: string) =>
      mutate((n) => {
        const photo = n.unassignedPhotos.find((p) => p.id === photoId);
        if (!photo) return n;
        const newStep: Step = {
          id: uuid(),
          order: n.steps.length,
          title: '',
          description: '',
          highlights: [],
          photos: [photo],
          hint: '',
        };
        return {
          ...n,
          unassignedPhotos: n.unassignedPhotos.filter((p) => p.id !== photoId),
          steps: [...n.steps, newStep],
        };
      }),
    [mutate]
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setDraft(prev);
      const next = h.slice(0, -1);
      if (next.length === 0) setIsDirty(false);
      return next;
    });
  }, []);

  const canUndo = history.length > 0;

  const resetDirty = useCallback(() => setIsDirty(false), []);

  const reset = useCallback((note: Note) => {
    setDraft(note);
    setIsDirty(false);
    setHistory([]);
  }, []);

  const revert = useCallback(() => {
    setDraft(initialNote);
    setIsDirty(false);
    setHistory([]);
  }, [initialNote]);

  return {
    draft,
    isDirty,
    canUndo,
    setTitle,
    setCategoryId,
    addTag,
    removeTag,
    addStep,
    insertStep,
    removeStep,
    reorderSteps,
    updateStep,
    addHighlight,
    updateHighlight,
    removeHighlight,
    removePhoto,
    setEyecatchPhotoId,
    getAllPhotos,
    addUnassignedPhotos,
    removeUnassignedPhoto,
    assignPhotoToStep,
    createStepWithPhoto,
    movePhotoToStep,
    movePhotoToUnassigned,
    reorderPhotosInStep,
    undo,
    resetDirty,
    reset,
    revert,
  };
}
