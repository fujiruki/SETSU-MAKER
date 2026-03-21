import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
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
import { Save, Plus, Upload, ArrowLeft, RotateCcw, Undo2, Eye, FolderOpen, X, Image as ImageIcon } from 'lucide-react';
import { ImageEditorLightbox } from '@fujiruki/react-image-editor-lightbox';
import type { ImageEditorSaveResult } from '@fujiruki/react-image-editor-lightbox';
import { StepCard, StepInsertButton } from '../components/StepCard';
import { TagInput } from '../components/TagInput';
import { EyecatchPickerModal } from '../components/EyecatchPickerModal';
import { useNoteEditorViewModel } from '../viewmodels/useNoteEditorViewModel';
import type { Note, Tag, Photo, Category } from '../models/types';
import { noteRepo, categoryRepo, tagRepo } from '../repositories/ApiNoteRepository';

export function NoteEditView() {
  const { noteId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { note?: Note; initialCategoryId?: string } | null;
  const initialNote: Note = state?.note ?? {
    id: 'new',
    title: '',
    categoryId: state?.initialCategoryId || 'uncategorized',
    tagIds: [],
    steps: [],
    unassignedPhotos: [],
    eyecatchPhotoId: null,
    handwritingData: null,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const vm = useNoteEditorViewModel(initialNote);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ photo: Photo; stepId: string } | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEyecatchPicker, setShowEyecatchPicker] = useState(false);
  const [unassignedContextMenu, setUnassignedContextMenu] = useState<{ photo: Photo; x: number; y: number } | null>(null);
  const bulkUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    categoryRepo.getAll().then(setCategories).catch(console.error);
    tagRepo.getAll().then(setAllTags).catch(console.error);
  }, []);

  useEffect(() => {
    if (noteId && noteId !== 'new' && !location.state) {
      noteRepo.getById(noteId).then((note) => {
        if (note) vm.reset(note);
      }).catch(console.error);
    }
  }, [noteId]);

  useEffect(() => {
    const close = () => setUnassignedContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const getBreadcrumb = (categoryId: string): Category[] => {
    const path: Category[] = [];
    let current = categories.find((c) => c.id === categoryId);
    while (current) {
      path.unshift(current);
      current = current.parentId
        ? categories.find((c) => c.id === current!.parentId)
        : undefined;
    }
    return path;
  };
  const breadcrumb = getBreadcrumb(vm.draft.categoryId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      vm.reorderSteps(String(active.id), String(over.id));
    }
  };

  const uploadPhotos = async (photos: Photo[], noteId: string, stepId: string) => {
    return Promise.all(
      photos.map(async (photo) => {
        if (!photo.url.startsWith('blob:')) return photo;
        const res = await fetch(photo.url);
        const blob = await res.blob();
        const file = new File([blob], `${photo.id}.jpg`, { type: blob.type });
        const result = await noteRepo.uploadPhoto(noteId, stepId, file);
        return { ...photo, url: result.url, takenAt: result.takenAt ?? photo.takenAt };
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const effectiveId = noteId === 'new'
        ? (await noteRepo.create(vm.draft.categoryId || '', vm.draft.title)).id
        : vm.draft.id;

      const uploadedSteps = await Promise.all(
        vm.draft.steps.map(async (step) => ({
          ...step,
          photos: await uploadPhotos(step.photos, effectiveId, step.id),
        }))
      );

      const uploadedUnassigned = await uploadPhotos(
        vm.draft.unassignedPhotos, effectiveId, '__unassigned__'
      );

      const noteToSave = {
        ...vm.draft,
        id: effectiveId,
        steps: uploadedSteps,
        unassignedPhotos: uploadedUnassigned,
      };
      const saved = await noteRepo.update(noteToSave);
      vm.reset(saved);

      if (noteId === 'new') {
        navigate(`/notes/${effectiveId}/edit`, { replace: true });
      }

      const hhmm = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      setSavedMessage(`保存しました ${hhmm}`);
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (e) {
      console.error(e);
      setSavedMessage('保存に失敗しました');
    }
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

  const handleCreateTag = async (name: string): Promise<Tag> => {
    const tag = await tagRepo.create(name);
    setAllTags((prev) => [...prev, tag]);
    return tag;
  };

  const handleBulkUpload = (files: FileList) => {
    const photos: Photo[] = Array.from(files).map((file, i) => ({
      id: `photo-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      annotations: [],
      cropRegion: null,
      takenAt: null,
      createdAt: new Date().toISOString(),
      order: i,
    }));
    vm.addUnassignedPhotos(photos);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            onClick={() => {
              if (vm.isDirty && !confirm('保存されていない変更があります。破棄して戻りますか？')) return;
              navigate(noteId && noteId !== 'new' ? `/notes/${noteId}` : '/app');
            }}
            className="text-gray-400 hover:text-gray-600 touch-manipulation p-3 -ml-2"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="flex items-center gap-1 text-sm text-gray-500 flex-1 min-w-0 hover:text-blue-600 touch-manipulation"
          >
            <FolderOpen size={14} className="shrink-0 text-amber-400" />
            <span className="truncate">
              {breadcrumb.map((c) => c.name).join(' / ') || 'カテゴリ未設定'}
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={vm.undo}
              disabled={!vm.canUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 touch-manipulation disabled:opacity-30"
              title="元に戻す"
            >
              <Undo2 size={15} />
              <span className="hidden sm:inline">戻す</span>
            </button>
            <button
              onClick={() => bulkUploadRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 touch-manipulation"
            >
              <Upload size={15} />
              <span className="hidden sm:inline">まとめてアップロード</span>
            </button>
            <input
              ref={bulkUploadRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleBulkUpload(e.target.files)}
            />
            {vm.isDirty && (
              <button
                onClick={() => setShowRevertConfirm(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 touch-manipulation"
              >
                <RotateCcw size={15} />
                編集前に戻す
              </button>
            )}
            {savedMessage && (
              <span className="text-xs text-green-600 whitespace-nowrap">{savedMessage}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !vm.isDirty}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 touch-manipulation font-medium"
            >
              <Save size={15} />
              {isSaving ? '保存中...' : '保存'}
            </button>
            {noteId && noteId !== 'new' && (
              <button
                onClick={() => {
                  if (vm.isDirty && !confirm('保存されていない変更があります。破棄して閲覧モードに移動しますか？')) return;
                  navigate(`/notes/${noteId}`);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 touch-manipulation"
              >
                <Eye size={15} />
                閲覧モードに戻る
              </button>
            )}
          </div>
        </div>
      </header>

      {showRevertConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-800 mb-2">編集前に戻しますか？</h3>
            <p className="text-sm text-gray-500 mb-5">
              加えたすべての変更が破棄されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRevertConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 touch-manipulation"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  vm.revert();
                  setShowRevertConfirm(false);
                }}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 touch-manipulation font-medium"
              >
                元に戻す
              </button>
            </div>
          </div>
        </div>
      )}

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
            onCreateTag={handleCreateTag}
          />

          {/* アイキャッチ画像 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEyecatchPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 touch-manipulation text-gray-600"
            >
              <ImageIcon size={15} />
              アイキャッチ画像を選ぶ
            </button>
            {vm.draft.eyecatchPhotoId ? (
              <span className="text-xs text-blue-600">選択済み</span>
            ) : (
              <span className="text-xs text-gray-400">最後の写真が自動選択されます</span>
            )}
          </div>
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
                    onRemovePhoto={(photoId) => vm.removePhoto(step.id, photoId)}
                    onPhotoClick={(photo) => setLightboxPhoto({ photo, stepId: step.id })}
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

        {/* 未割り当て写真プール */}
        {vm.draft.unassignedPhotos.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              未割り当ての写真 ({vm.draft.unassignedPhotos.length})
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {vm.draft.unassignedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setUnassignedContextMenu({ photo, x: e.clientX, y: e.clientY });
                  }}
                >
                  <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => vm.createStepWithPhoto(photo.id)}
                    className="absolute top-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center touch-manipulation opacity-0 group-hover:opacity-100 transition-opacity"
                    title="新しい工程を作成"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => vm.removeUnassignedPhoto(photo.id)}
                    className="absolute top-1 left-1 bg-black/50 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center touch-manipulation opacity-0 group-hover:opacity-100 transition-opacity"
                    title="削除"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 未割り当て写真の右クリックメニュー */}
      {unassignedContextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ top: unassignedContextMenu.y, left: unassignedContextMenu.x, minWidth: '200px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">工程に割り当て</div>
          {vm.draft.steps.map((step, i) => (
            <button
              key={step.id}
              onClick={() => {
                vm.assignPhotoToStep(unassignedContextMenu.photo.id, step.id);
                setUnassignedContextMenu(null);
              }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation"
            >
              {step.title || `工程 ${i + 1}`}
            </button>
          ))}
          {vm.draft.steps.length === 0 && (
            <div className="px-4 py-2.5 text-sm text-gray-400">工程がありません</div>
          )}
          <button
            onClick={() => {
              vm.createStepWithPhoto(unassignedContextMenu.photo.id);
              setUnassignedContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 touch-manipulation"
          >
            <Plus size={14} />
            新しい工程を作成して割り当て
          </button>
        </div>
      )}

      <ImageEditorLightbox
        isOpen={!!lightboxPhoto}
        imageUrl={lightboxPhoto?.photo.url ?? null}
        initialCropRegion={lightboxPhoto?.photo.cropRegion ?? null}
        onSave={async (result: ImageEditorSaveResult) => {
          if (!lightboxPhoto) return;
          const { photo, stepId } = lightboxPhoto;
          const newUrl = URL.createObjectURL(result.annotatedBlob);
          const step = vm.draft.steps.find((s) => s.id === stepId);
          if (step) {
            const updatedPhotos = step.photos.map((p) =>
              p.id === photo.id
                ? { ...p, url: newUrl, cropRegion: result.cropRegion }
                : p
            );
            vm.updateStep(stepId, { photos: updatedPhotos });
          }
          setLightboxPhoto(null);
        }}
        onClose={() => setLightboxPhoto(null)}
        zIndex={60}
      />

      {showEyecatchPicker && (
        <EyecatchPickerModal
          photos={vm.getAllPhotos()}
          selectedPhotoId={vm.draft.eyecatchPhotoId}
          onSelect={vm.setEyecatchPhotoId}
          onClose={() => setShowEyecatchPicker(false)}
        />
      )}

      {showCategoryPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">カテゴリを選択</h3>
              <button
                onClick={() => setShowCategoryPicker(false)}
                className="text-gray-400 hover:text-gray-600 p-3 -mr-2 touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg mb-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { vm.setCategoryId(cat.id); setShowCategoryPicker(false); }}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 ${
                    vm.draft.categoryId === cat.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FolderOpen size={15} className="text-amber-400 shrink-0" />
                  {cat.parentId
                    ? `${categories.find((c) => c.id === cat.parentId)?.name} / ${cat.name}`
                    : cat.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCategoryPicker(false)}
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
