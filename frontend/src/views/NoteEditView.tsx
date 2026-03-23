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
import { VideoTrimmer } from '../components/VideoTrimmer';
import type { Note, Tag, Photo, Category } from '../models/types';
import { noteRepo, categoryRepo, tagRepo } from '../repositories/ApiNoteRepository';
import { resizeImage } from '../utils/imageResize';
import { captureVideoThumbnail } from '../utils/videoThumbnail';

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
  const [saveProgress, setSaveProgress] = useState<number | null>(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ photo: Photo; stepId: string } | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEyecatchPicker, setShowEyecatchPicker] = useState(false);
  const [unassignedContextMenu, setUnassignedContextMenu] = useState<{ photo: Photo; x: number; y: number } | null>(null);
  const [trimmerState, setTrimmerState] = useState<{ file: File; stepId: string } | null>(null);
  const [videoQueue, setVideoQueue] = useState<{ file: File; stepId: string }[]>([]);
  const [videoPreview, setVideoPreview] = useState<Photo | null>(null);
  const [retrimTarget, setRetrimTarget] = useState<{ photo: Photo; stepId: string } | null>(null);
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

  useEffect(() => {
    if (saveProgress === null) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveProgress]);

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

  const THUMBNAIL_MAX_SIZE = 480;

  const mimeToExt = (mime: string): string => {
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('quicktime') || mime.includes('mov')) return 'mov';
    if (mime.includes('png')) return 'png';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('webp')) return 'webp';
    return 'jpg';
  };

  const uploadPhotos = async (
    photos: Photo[],
    noteId: string,
    stepId: string,
    onProgress?: () => void,
  ) => {
    const results: Photo[] = [];
    for (const photo of photos) {
      if (!photo.url.startsWith('blob:')) {
        results.push(photo);
        onProgress?.();
        continue;
      }
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const isVideo = photo.mediaType === 'video';
      const ext = isVideo ? mimeToExt(blob.type) : 'jpg';
      const file = new File([blob], `${photo.id}.${ext}`, { type: blob.type });
      let thumbFile: File | undefined;
      if (isVideo) {
        try {
          const thumbBlob = await captureVideoThumbnail(blob, THUMBNAIL_MAX_SIZE);
          thumbFile = new File([thumbBlob], `${photo.id}_thumb.jpg`, { type: 'image/jpeg' });
        } catch { /* サムネイル生成失敗は無視 */ }
      } else {
        const thumbBlob = await resizeImage(blob, THUMBNAIL_MAX_SIZE);
        if (thumbBlob !== blob) {
          thumbFile = new File([thumbBlob], `${photo.id}_thumb.jpg`, { type: 'image/jpeg' });
        }
      }
      const result = await noteRepo.uploadPhoto(noteId, stepId, file, thumbFile);
      results.push({
        ...photo,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl ?? undefined,
        mediaType: photo.mediaType,
        takenAt: result.takenAt ?? photo.takenAt,
      });
      onProgress?.();
    }
    return results;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allPhotos = [
        ...vm.draft.steps.flatMap((s) => s.photos),
        ...vm.draft.unassignedPhotos,
      ];
      const totalCount = allPhotos.length;
      let completedCount = 0;
      if (totalCount > 0) setSaveProgress(0);

      const onProgress = () => {
        completedCount++;
        setSaveProgress(totalCount > 0 ? completedCount / totalCount : 1);
      };

      const effectiveId = noteId === 'new'
        ? (await noteRepo.create(vm.draft.categoryId || '', vm.draft.title)).id
        : vm.draft.id;

      const uploadedSteps: typeof vm.draft.steps = [];
      for (const step of vm.draft.steps) {
        uploadedSteps.push({
          ...step,
          photos: await uploadPhotos(step.photos, effectiveId, step.id, onProgress),
        });
      }

      const uploadedUnassigned = await uploadPhotos(
        vm.draft.unassignedPhotos, effectiveId, '__unassigned__', onProgress,
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

      setSaveProgress(1);
      setTimeout(() => setSaveProgress(null), 1500);

      const hhmm = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      setSavedMessage(`保存しました ${hhmm}`);
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (e) {
      console.error(e);
      setSavedMessage('保存に失敗しました');
      setSaveProgress(null);
    }
    setIsSaving(false);
  };

  const handleAddPhotos = (stepId: string, files: FileList) => {
    const imageFiles: File[] = [];
    const videos: { file: File; stepId: string }[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith('video/')) {
        videos.push({ file, stepId });
      } else {
        imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      const photos: Photo[] = imageFiles.map((file, i) => ({
        id: `photo-${Date.now()}-${i}`,
        mediaType: 'image' as const,
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
    }

    if (videos.length > 0) {
      setTrimmerState(videos[0]);
      setVideoQueue(videos.slice(1));
    }
  };

  const handleTrimComplete = (results: { blob: Blob; mediaType: 'video' | 'image'; duration: number }[]) => {
    if (!trimmerState) return;
    const { stepId } = trimmerState;
    const photos: Photo[] = results.map((result, i) => ({
      id: `video-${Date.now()}-${i}`,
      mediaType: result.mediaType === 'video' ? 'video' as const : 'image' as const,
      url: URL.createObjectURL(result.blob),
      annotations: [],
      cropRegion: null,
      duration: result.duration,
      takenAt: null,
      createdAt: new Date().toISOString(),
      order: i,
    }));
    if (stepId === '__unassigned__') {
      vm.addUnassignedPhotos(photos);
    } else {
      const step = vm.draft.steps.find((s) => s.id === stepId);
      if (step) {
        vm.updateStep(stepId, { photos: [...step.photos, ...photos] });
      }
    }
    if (videoQueue.length > 0) {
      setTrimmerState(videoQueue[0]);
      setVideoQueue(videoQueue.slice(1));
    } else {
      setTrimmerState(null);
    }
  };

  const handleTrimExistingVideo = async (photo: Photo, stepId: string) => {
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const file = new File([blob], 'retrim.mp4', { type: blob.type || 'video/mp4' });
      setRetrimTarget({ photo, stepId });
      setTrimmerState({ file, stepId });
    } catch {
      alert('動画の読み込みに失敗しました');
    }
  };

  const handleRetrimComplete = (results: { blob: Blob; mediaType: 'video' | 'image'; duration: number }[]) => {
    if (!retrimTarget) {
      handleTrimComplete(results);
      return;
    }
    const { photo, stepId } = retrimTarget;
    const step = vm.draft.steps.find((s) => s.id === stepId);
    if (step && results.length > 0) {
      const newPhotos: Photo[] = results.map((r, i) => ({
        id: i === 0 ? photo.id : `video-${Date.now()}-${i}`,
        mediaType: r.mediaType === 'video' ? 'video' as const : 'image' as const,
        url: URL.createObjectURL(r.blob),
        annotations: [],
        cropRegion: null,
        duration: r.duration,
        takenAt: null,
        createdAt: new Date().toISOString(),
        order: 0,
      }));
      const idx = step.photos.findIndex((p) => p.id === photo.id);
      const updated = [...step.photos];
      updated.splice(idx, 1, ...newPhotos);
      vm.updateStep(stepId, { photos: updated.map((p, j) => ({ ...p, order: j })) });
    }
    setRetrimTarget(null);
    if (videoQueue.length > 0) {
      setTrimmerState(videoQueue[0]);
      setVideoQueue(videoQueue.slice(1));
    } else {
      setTrimmerState(null);
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    const tag = await tagRepo.create(name);
    setAllTags((prev) => [...prev, tag]);
    return tag;
  };

  const handleBulkUpload = (files: FileList) => {
    const photos: Photo[] = [];
    const videos: { file: File; stepId: string }[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith('video/')) {
        videos.push({ file, stepId: '__unassigned__' });
        continue;
      }
      photos.push({
        id: `photo-${Date.now()}-${photos.length}`,
        mediaType: 'image' as const,
        url: URL.createObjectURL(file),
        annotations: [],
        cropRegion: null,
        takenAt: null,
        createdAt: new Date().toISOString(),
        order: photos.length,
      });
    }
    if (photos.length > 0) vm.addUnassignedPhotos(photos);
    if (videos.length > 0) {
      setTrimmerState(videos[0]);
      setVideoQueue(videos.slice(1));
    }
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
              <span className="hidden sm:inline">まとめて追加</span>
            </button>
            <input
              ref={bulkUploadRef}
              type="file"
              accept="image/*,video/*"
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

      {saveProgress !== null && (
        <div className="sticky top-[49px] z-10 h-0.5 bg-gray-200">
          <div
            className={`h-full transition-all duration-300 ${saveProgress >= 1 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.round(saveProgress * 100)}%` }}
          />
        </div>
      )}

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
                    onPhotoClick={(photo) => {
                      if (photo.mediaType === 'video') {
                        setVideoPreview(photo);
                      } else {
                        setLightboxPhoto({ photo, stepId: step.id });
                      }
                    }}
                    onTrimVideo={(photo) => handleTrimExistingVideo(photo, step.id)}
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
                    <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
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

      {videoPreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-[5vmin]"
          onClick={(e) => { if (e.target === e.currentTarget) setVideoPreview(null); }}
        >
          <div
            className="relative flex flex-col items-center"
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <video
              src={videoPreview.url}
              controls
              playsInline
              autoPlay
              className="rounded-lg"
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setVideoPreview(null)}
              className="mt-3 px-6 py-2 bg-white/90 border border-gray-200 rounded-full text-sm hover:bg-white touch-manipulation"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <VideoTrimmer
        isOpen={!!trimmerState}
        videoFile={trimmerState?.file ?? null}
        onComplete={retrimTarget ? handleRetrimComplete : handleTrimComplete}
        onClose={() => setTrimmerState(null)}
      />

      <ImageEditorLightbox
        isOpen={!!lightboxPhoto}
        imageUrl={lightboxPhoto?.photo.url ?? null}
        initialCropRegion={lightboxPhoto?.photo.cropRegion ?? null}
        onSave={async (result: ImageEditorSaveResult) => {
          if (!lightboxPhoto) return;
          const { photo, stepId } = lightboxPhoto;
          const newUrl = URL.createObjectURL(result.annotatedBlob);
          const thumbBlob = await resizeImage(result.annotatedBlob, THUMBNAIL_MAX_SIZE);
          const newThumbUrl = thumbBlob !== result.annotatedBlob
            ? URL.createObjectURL(thumbBlob)
            : newUrl;
          const step = vm.draft.steps.find((s) => s.id === stepId);
          if (step) {
            const updatedPhotos = step.photos.map((p) =>
              p.id === photo.id
                ? { ...p, url: newUrl, thumbnailUrl: newThumbUrl, cropRegion: result.cropRegion }
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
