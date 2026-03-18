import { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical, Trash2, Plus, Camera, Upload, Clipboard } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HighlightBlock, AddHighlightButton } from './HighlightBlock';
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
  onPhotoClick: (photo: Photo) => void;
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
  onPhotoClick,
}: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-xl shadow-sm">
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

      <div className="flex gap-3 p-3">
        <div className="flex-1 space-y-3">
          {step.photos.length > 0 && (
            <div className="space-y-2">
              {step.photos.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  onClick={() => onPhotoClick(photo)}
                />
              ))}
            </div>
          )}

          {editable && (
            <PhotoAddMenu
              onAddPhotos={onAddPhotos}
              showMenu={showPhotoMenu}
              setShowMenu={setShowPhotoMenu}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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

          {editable ? (
            <textarea
              value={step.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="説明を入力..."
              rows={3}
              className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          ) : (
            step.description && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.description}</p>
            )
          )}

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

        <div className="w-32 shrink-0">
          {(editable || hintEditable || step.hint) && (
            <div className="border border-dashed border-gray-200 rounded-lg p-2">
              <p className="text-xs text-gray-400 mb-1">ヒント</p>
              {editable || hintEditable ? (
                <textarea
                  value={step.hint}
                  onChange={(e) => onUpdate({ hint: e.target.value })}
                  placeholder="補足情報..."
                  rows={4}
                  className="w-full text-xs text-gray-600 bg-transparent resize-none outline-none"
                />
              ) : (
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{step.hint}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoThumbnail({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  }, []);

  const crop = photo.cropRegion;

  const btnCls = "block w-full rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 touch-manipulation active:opacity-80";

  if (crop && naturalSize) {
    // クロップ領域のアスペクト比でコンテナを確保し、画像をオフセット表示
    const imgWidthPct = (naturalSize.w / crop.width) * 100;
    const leftPct     = -(crop.x / crop.width) * 100;
    const topPct      = -(crop.y / crop.height) * 100;
    return (
      <button onClick={onClick} className={btnCls}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: `${crop.width}/${crop.height}`, overflow: 'hidden' }}>
          <img
            src={photo.url}
            alt=""
            style={{ position: 'absolute', width: `${imgWidthPct}%`, left: `${leftPct}%`, top: `${topPct}%` }}
            onLoad={handleLoad}
          />
        </div>
      </button>
    );
  }

  // クロップなし or 読み込み前: 元画像の比率通りに表示
  return (
    <button onClick={onClick} className={btnCls}>
      <img
        src={photo.url}
        alt=""
        className="block w-full h-auto"
        onLoad={handleLoad}
      />
    </button>
  );
}

interface PhotoAddMenuProps {
  onAddPhotos: (files: FileList) => void;
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
}

function PhotoAddMenu({ onAddPhotos, showMenu, setShowMenu, fileInputRef, cameraInputRef }: PhotoAddMenuProps) {
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
        写真を追加
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
            onClick={() => { setShowMenu(false); fileInputRef.current?.click(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 touch-manipulation border-b border-gray-100"
          >
            <Upload size={16} className="text-gray-400 shrink-0" />
            アップロード
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
        className={`absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-7 h-7 rounded border-2 bg-white transition-all touch-manipulation ${
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
