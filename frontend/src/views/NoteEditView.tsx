import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronRight, Save, Plus, Upload, ArrowLeft } from 'lucide-react';
import { StepCard, StepInsertButton } from '../components/StepCard';
import { TagInput } from '../components/TagInput';
import { useNoteEditorViewModel } from '../viewmodels/useNoteEditorViewModel';
import type { Note, Tag, Photo } from '../models/types';

const MOCK_NOTE: Note = {
  id: 'note-1',
  title: '',
  categoryId: 'cat-1',
  tagIds: [],
  steps: [],
  eyecatchPhotoId: null,
  handwritingData: null,
  isFavorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_TAGS: Tag[] = [
  { id: 't1', name: '建具' },
  { id: 't2', name: '引き戸' },
  { id: 't3', name: '塗装' },
];

const MOCK_BREADCRUMB = [
  { id: 'cat-1', name: '建具' },
  { id: 'cat-2', name: '引き戸' },
];

export function NoteEditView() {
  const { noteId } = useParams();
  const vm = useNoteEditorViewModel(MOCK_NOTE);
  const [allTags] = useState<Tag[]>(MOCK_TAGS);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const bulkUploadRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      vm.reorderSteps(String(active.id), String(over.id));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    vm.resetDirty();
    setIsSaving(false);
  };

  const handleAddPhotos = (stepId: string, files: FileList) => {
    const photos: Photo[] = Array.from(files).map((file, i) => ({
      id: `photo-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      annotations: [],
      cropRegion: null,
      takenAt: null,
      createdAt: new Date().toISOString(),
      order: i,
    }));
    const step = vm.draft.steps.find((s) => s.id === stepId);
    if (step) {
      const sorted = [...step.photos, ...photos].sort((a, b) =>
        (a.takenAt ?? a.createdAt).localeCompare(b.takenAt ?? b.createdAt)
      );
      vm.updateStep(stepId, { photos: sorted.map((p, i) => ({ ...p, order: i })) });
    }
  };

  const handleBulkUpload = (files: FileList) => {
    if (vm.draft.steps.length === 0) {
      vm.addStep();
    }
    const targetStep = vm.draft.steps[vm.draft.steps.length - 1];
    if (targetStep) {
      handleAddPhotos(targetStep.id, files);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-2">
          <Link to={noteId ? `/notes/${noteId}` : '/'} className="text-gray-400 hover:text-gray-600 touch-manipulation p-1">
            <ArrowLeft size={20} />
          </Link>
          <nav className="flex items-center gap-1 text-sm text-gray-500 flex-1 min-w-0">
            {MOCK_BREADCRUMB.map((cat, i) => (
              <span key={cat.id} className="flex items-center gap-1 truncate">
                {i > 0 && <ChevronRight size={14} className="shrink-0" />}
                <Link to={`/categories/${cat.id}`} className="hover:text-gray-700 truncate">
                  {cat.name}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => bulkUploadRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 touch-manipulation"
            >
              <Upload size={15} />
              まとめてアップロード
            </button>
            <input
              ref={bulkUploadRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleBulkUpload(e.target.files)}
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !vm.isDirty}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 touch-manipulation font-medium"
            >
              <Save size={15} />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 py-4 flex-1">
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>作成日: {new Date(vm.draft.createdAt).toLocaleDateString('ja-JP')}</span>
            <span>更新日: {new Date(vm.draft.updatedAt).toLocaleDateString('ja-JP')}</span>
          </div>

          <input
            type="text"
            value={vm.draft.title}
            onChange={(e) => vm.setTitle(e.target.value)}
            placeholder="ノートのタイトル"
            className="w-full text-2xl font-bold text-gray-800 bg-transparent outline-none border-b-2 border-transparent focus:border-blue-400 pb-1"
          />

          <TagInput
            selectedTagIds={vm.draft.tagIds}
            allTags={allTags}
            onAdd={vm.addTag}
            onRemove={vm.removeTag}
          />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={vm.draft.steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0">
              {vm.draft.steps.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="mb-3">工程がまだありません</p>
                </div>
              )}

              {vm.draft.steps.map((step, i) => (
                <div key={step.id}>
                  {i === 0 && (
                    <StepInsertButton onInsert={() => vm.insertStep(-1)} />
                  )}
                  <StepCard
                    step={step}
                    index={i}
                    editable
                    hintEditable={false}
                    onUpdate={(patch) => vm.updateStep(step.id, patch)}
                    onRemove={() => vm.removeStep(step.id)}
                    onAddHighlight={(type) => vm.addHighlight(step.id, type)}
                    onUpdateHighlight={(hid, content) => vm.updateHighlight(step.id, hid, content)}
                    onRemoveHighlight={(hid) => vm.removeHighlight(step.id, hid)}
                    onAddPhotos={(files) => handleAddPhotos(step.id, files)}
                    onPhotoClick={setLightboxPhoto}
                  />
                  <StepInsertButton onInsert={() => vm.insertStep(i)} />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex justify-center mt-4">
          <button
            onClick={vm.addStep}
            className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 touch-manipulation font-medium"
          >
            <Plus size={18} />
            工程を追加
          </button>
        </div>
      </div>

      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 max-w-2xl w-full">
            <p className="text-sm text-gray-500 mb-2">ライトボックス（矢印・トリミング機能は実装予定）</p>
            <img src={lightboxPhoto.url} alt="" className="w-full rounded-lg" />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="mt-3 w-full py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
