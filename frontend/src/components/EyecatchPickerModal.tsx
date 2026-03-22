import { X, Check, ImageOff } from 'lucide-react';
import type { Photo } from '../models/types';

interface EyecatchPickerModalProps {
  photos: Photo[];
  selectedPhotoId: string | null;
  onSelect: (photoId: string | null) => void;
  onClose: () => void;
}

export function EyecatchPickerModal({ photos, selectedPhotoId, onSelect, onClose }: EyecatchPickerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">アイキャッチ画像を選ぶ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-3 -mr-2 touch-manipulation">
            <X size={18} />
          </button>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ImageOff size={32} className="mx-auto mb-2" />
            <p className="text-sm">写真がまだありません</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="mb-3 w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 touch-manipulation"
            >
              選択解除（最後の写真を自動使用）
            </button>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => { onSelect(photo.id); onClose(); }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 touch-manipulation ${
                      selectedPhotoId === photo.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                    {selectedPhotoId === photo.id && (
                      <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                        <Check size={24} className="text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
