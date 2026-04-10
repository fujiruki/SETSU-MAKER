import { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical, Trash2, Plus, Camera, Upload, Clipboard, X, Play, Video, Scissors } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HighlightBlock, AddHighlightButton } from './HighlightBlock';
import { DraggablePhotoThumbnail } from './DraggablePhoto';
import type { Step, HighlightType, Photo } from '../models/types';

interface StepCardProps {
  step: Step;
  index: number;
  editable: boolean;
  hintEditable: boolean;
  onUpdate: (patch: Partial<Step>) => void;
  onRemove: () => void;
  onAddHighlight: (type: HighlightType) => void;
  onUpdateHighlight: (highlightId: string, content: string) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onAddPhotos: (files: FileList) => void;
  onRemovePhoto?: (photoId: string) => void;
  onPhotoClick: (photo: Photo) => void;
  onTrimVideo?: (photo: Photo) => void;
}

export function StepCard({
  step,
  index,
  editable,
  hintEditable,
  onUpdate,
  onRemove,
  onAddHighlight,
  onUpdateHighlight,
  onRemoveHighlight,
  onAddPhotos,
  onRemovePhoto,
  onPhotoClick,
  onTrimVideo,
}: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `step:${step.id}` });

  const photoIds = step.photos.map((p) => `photo:${p.id}:${step.id}`);
  const { setNodeRef: setPhotoDropRef, isOver: isPhotoDropOver } = useDroppable({
    id: `step-photos:${step.id}`,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  const descRef = useRef<HTMLTextAreaElement>(null);
  const hintRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => { autoResize(descRef.current); }, [step.description, autoResize]);
  useEffect(() => { autoResize(hintRef.current); }, [step.hint, autoResize]);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* 上段: タイトル */}
      <div className="flex items-start gap-2 p-3 border-b border-gray-100">
        {editable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-manipulation shrink-0"
          >
            <GripVertical size={20} />
          </button>
        )}

        <div className="flex-1 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-400 w-8 shrink-0">{index + 1}.</span>
          {editable ? (
            <input
              type="text"
              value={step.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="工程タイトル"
              className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none border-b border-transparent focus:border-blue-400 py-0.5"
            />
          ) : (
            <h3 className="flex-1 text-base font-semibold text-gray-800">{step.title || `工程 ${index + 1}`}</h3>
          )}
        </div>

        {editable && (
          <button
            onClick={onRemove}
            className="text-gray-300 hover:text-red-400 touch-manipulation shrink-0"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* 中段: 左=画像 右=説明+ヒント */}
      <div className="flex gap-3 p-3">
        {/* 左列: 画像 */}
        <div
          ref={editable ? setPhotoDropRef : undefined}
          className={`w-2/5 shrink-0 space-y-2 rounded-lg transition-colors ${
            editable && isPhotoDropOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''
          }`}
        >
          <SortableContext items={photoIds} strategy={rectSortingStrategy}>
            {step.photos.map((photo) => (
              editable ? (
                <DraggablePhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  stepId={step.id}
                  editable={editable}
                  onClick={() => onPhotoClick(photo)}
                  onRemove={onRemovePhoto ? () => onRemovePhoto(photo.id) : undefined}
                  onTrim={onTrimVideo ? () => onTrimVideo(photo) : undefined}
                />
              ) : (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  editable={editable}
                  onClick={() => onPhotoClick(photo)}
                  onRemove={onRemovePhoto ? () => onRemovePhoto(photo.id) : undefined}
                  onTrim={editable && onTrimVideo ? () => onTrimVideo(photo) : undefined}
                />
              )
            ))}
          </SortableContext>

          {editable && (
            <>
              <PhotoAddMenu
                onAddPhotos={onAddPhotos}
                showMenu={showPhotoMenu}
                setShowMenu={setShowPhotoMenu}
                fileInputRef={fileInputRef}
                cameraInputRef={cameraInputRef}
                videoCameraInputRef={videoCameraInputRef}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && onAddPhotos(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && onAddPhotos(e.target.files)}
              />
              <input
                ref={videoCameraInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && onAddPhotos(e.target.files)}
              />
            </>
          )}
        </div>

        {/* 右列: 説明 + ヒント */}
        <div className="flex-1 min-w-0 space-y-3">
          {editable ? (
            <textarea
              ref={descRef}
              value={step.description}
              onChange={(e) => { onUpdate({ description: e.target.value }); autoResize(e.target); }}
              placeholder="説明を入力..."
              className="w-full text-base text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              style={{ maxHeight: '50vh', overflow: 'auto' }}
            />
          ) : (
            step.description && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.description}</p>
            )
          )}

          <div className="border border-dashed border-gray-200 rounded-lg p-2">
            <p className="text-sm text-gray-400 mb-1">ヒント</p>
            {editable || hintEditable ? (
              <textarea
                ref={hintRef}
                value={step.hint}
                onChange={(e) => { onUpdate({ hint: e.target.value }); autoResize(e.target); }}
                placeholder="補足情報..."
                className="w-full text-base text-gray-600 bg-transparent resize-none outline-none"
                style={{ maxHeight: '50vh', overflow: 'auto' }}
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.hint || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* 下段: ハイライト + コントロール */}
      {(step.highlights.length > 0 || editable) && (
        <div className="px-3 pb-3 space-y-2">
          {step.highlights.map((h) => (
            <HighlightBlock
              key={h.id}
              block={h}
              editable={editable}
              onChange={(content) => onUpdateHighlight(h.id, content)}
              onRemove={() => onRemoveHighlight(h.id)}
            />
          ))}

          {editable && (
            <AddHighlightButton onAdd={onAddHighlight} />
          )}
        </div>
      )}
    </div>
  );
}

function PhotoThumbnail({
  photo,
  editable,
  onClick,
  onRemove,
  onTrim,
}: {
  photo: Photo;
  editable: boolean;
  onClick: () => void;
  onRemove?: () => void;
  onTrim?: () => void;
}) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  }, []);

  const crop = photo.cropRegion;

  const btnCls = "block w-full rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 touch-manipulation active:opacity-80";

  const removeBtn = editable && onRemove && (
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      className="absolute top-1 right-1 z-10 bg-black/50 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center touch-manipulation"
    >
      <X size={14} />
    </button>
  );

  const isVideo = photo.mediaType === 'video';
  const displayUrl = photo.thumbnailUrl || photo.url;

  if (isVideo) {
    return (
      <div className="relative">
        {removeBtn}
        <button onClick={onClick} className={btnCls}>
          <div className="relative">
            {photo.thumbnailUrl ? (
              <img src={photo.thumbnailUrl} alt="" className="block w-full h-auto" />
            ) : (
              <video src={photo.url} className="block w-full h-auto" muted preload="metadata" playsInline />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">
                <Play size={20} className="text-gray-800 ml-0.5" />
              </div>
            </div>
          </div>
        </button>
        {onTrim && (
          <button
            onClick={(e) => { e.stopPropagation(); onTrim(); }}
            className="absolute bottom-1 right-1 z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 flex items-center justify-center touch-manipulation shadow"
            title="トリミング"
          >
            <Scissors size={14} />
          </button>
        )}
      </div>
    );
  }

  if (crop && naturalSize) {
    const imgWidthPct = (naturalSize.w / crop.width) * 100;
    const leftPct     = -(crop.x / crop.width) * 100;
    const topPct      = -(crop.y / crop.height) * 100;
    return (
      <div className="relative">
        {removeBtn}
        <button onClick={onClick} className={btnCls}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: `${crop.width}/${crop.height}`, overflow: 'hidden' }}>
            <img
              src={displayUrl}
              alt=""
              style={{ position: 'absolute', width: `${imgWidthPct}%`, left: `${leftPct}%`, top: `${topPct}%` }}
              onLoad={handleLoad}
            />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {removeBtn}
      <button onClick={onClick} className={btnCls}>
        <img
          src={displayUrl}
          alt=""
          className="block w-full h-auto"
          onLoad={handleLoad}
        />
      </button>
    </div>
  );
}

interface PhotoAddMenuProps {
  onAddPhotos: (files: FileList) => void;
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  videoCameraInputRef: React.RefObject<HTMLInputElement | null>;
}

function PhotoAddMenu({ onAddPhotos, showMenu, setShowMenu, fileInputRef, cameraInputRef, videoCameraInputRef }: PhotoAddMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu, setShowMenu]);

  const handleClipboard = async () => {
    setShowMenu(false);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard.${imageType.split('/')[1]}`, { type: imageType });
          const dt = new DataTransfer();
          dt.items.add(file);
          onAddPhotos(dt.files);
          return;
        }
      }
      alert('クリップボードに画像がありません');
    } catch {
      alert('クリップボードへのアクセスが許可されていません');
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 w-full justify-center touch-manipulation"
      >
        <Camera size={16} />
        写真・動画を追加
      </button>

      {showMenu && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
          <button
            onClick={() => { setShowMenu(false); cameraInputRef.current?.click(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation border-b border-gray-100"
          >
            <Camera size={16} className="text-gray-400 shrink-0" />
            写真を撮る
          </button>
          <button
            onClick={() => { setShowMenu(false); videoCameraInputRef.current?.click(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation border-b border-gray-100"
          >
            <Video size={16} className="text-gray-400 shrink-0" />
            動画を撮る
          </button>
          <button
            onClick={() => { setShowMenu(false); fileInputRef.current?.click(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation border-b border-gray-100"
          >
            <Upload size={16} className="text-gray-400 shrink-0" />
            ファイルから選ぶ
          </button>
          <button
            onClick={handleClipboard}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation"
          >
            <Clipboard size={16} className="text-gray-400 shrink-0" />
            クリップボードから追加
          </button>
        </div>
      )}
    </div>
  );
}

interface StepInsertButtonProps {
  onInsert: () => void;
}

export function StepInsertButton({ onInsert }: StepInsertButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-center my-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex-1 border-t transition-colors ${hovered ? 'border-blue-300' : 'border-gray-200'}`} />
      <button
        onClick={onInsert}
        className={`absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded border-2 bg-white transition-all touch-manipulation ${
          hovered
            ? 'border-blue-400 text-blue-500 shadow-sm scale-110'
            : 'border-gray-200 text-gray-300'
        }`}
      >
        <Plus size={14} />
      </button>
      <div className={`flex-1 border-t transition-colors ${hovered ? 'border-blue-300' : 'border-gray-200'}`} />
    </div>
  );
}
