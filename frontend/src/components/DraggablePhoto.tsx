import { useCallback, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus, Play, Scissors } from 'lucide-react';
import type { Photo } from '../models/types';

interface DraggablePhotoThumbnailProps {
  photo: Photo;
  stepId: string;
  editable: boolean;
  onClick: () => void;
  onRemove?: () => void;
  onTrim?: () => void;
}

export function DraggablePhotoThumbnail({
  photo,
  stepId,
  editable,
  onClick,
  onRemove,
  onTrim,
}: DraggablePhotoThumbnailProps) {
  const sortableId = `photo:${photo.id}:${stepId}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PhotoThumbnailInner
        photo={photo}
        editable={editable}
        onClick={onClick}
        onRemove={onRemove}
        onTrim={onTrim}
      />
    </div>
  );
}

interface UnassignedDraggablePhotoProps {
  photo: Photo;
  editable: boolean;
  onCreateStep: () => void;
  onRemove: () => void;
}

export function UnassignedDraggablePhoto({
  photo,
  editable,
  onCreateStep,
  onRemove,
}: UnassignedDraggablePhotoProps) {
  const sortableId = `photo:${photo.id}:unassigned`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
        <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
      </div>
      {editable && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onCreateStep(); }}
            className="absolute top-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center touch-manipulation opacity-0 group-hover:opacity-100 transition-opacity"
            title="新しい工程を作成"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-1 left-1 bg-black/50 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center touch-manipulation opacity-0 group-hover:opacity-100 transition-opacity"
            title="削除"
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}

function PhotoThumbnailInner({
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
  const displayUrl = photo.thumbnailUrl || photo.url;
  const isVideo = photo.mediaType === 'video';

  const removeBtn = editable && onRemove && (
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      className="absolute top-1 right-1 z-10 bg-black/50 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center touch-manipulation"
    >
      <X size={14} />
    </button>
  );

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
    const leftPct = -(crop.x / crop.width) * 100;
    const topPct = -(crop.y / crop.height) * 100;
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
        <img src={displayUrl} alt="" className="block w-full h-auto" onLoad={handleLoad} />
      </button>
    </div>
  );
}
