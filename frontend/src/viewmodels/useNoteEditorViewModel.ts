import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { Note, Step, HighlightType } from '../models/types';

export function useNoteEditorViewModel(initialNote: Note) {
  const [draft, setDraft] = useState<Note>(initialNote);
  const [isDirty, setIsDirty] = useState(false);

  const mutate = useCallback((updater: (prev: Note) => Note) => {
    setDraft(updater);
    setIsDirty(true);
  }, []);

  const setTitle = useCallback(
    (title: string) => mutate((n) => ({ ...n, title })),
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

  const resetDirty = useCallback(() => setIsDirty(false), []);

  return {
    draft,
    isDirty,
    setTitle,
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
    resetDirty,
  };
}
