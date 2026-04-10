import { AlertTriangle, Lightbulb, Info, X } from 'lucide-react';
import type { HighlightBlock as HighlightBlockType, HighlightType } from '../models/types';

const CONFIG: Record<HighlightType, {
  icon: React.ReactNode;
  label: string;
  className: string;
  labelClassName: string;
}> = {
  warning: {
    icon: <AlertTriangle size={16} />,
    label: '！注意',
    className: 'bg-red-50 border-red-300',
    labelClassName: 'text-red-600',
  },
  point: {
    icon: <Lightbulb size={16} />,
    label: 'Point!',
    className: 'bg-yellow-50 border-yellow-300',
    labelClassName: 'text-yellow-600',
  },
  note: {
    icon: <Info size={16} />,
    label: 'メモ',
    className: 'bg-blue-50 border-blue-300',
    labelClassName: 'text-blue-600',
  },
};

interface HighlightBlockProps {
  block: HighlightBlockType;
  editable?: boolean;
  onChange?: (content: string) => void;
  onRemove?: () => void;
}

export function HighlightBlock({ block, editable, onChange, onRemove }: HighlightBlockProps) {
  const config = CONFIG[block.type];

  return (
    <div className={`border-l-4 rounded-r-lg px-3 py-2 ${config.className} relative`}>
      <div className={`flex items-center gap-1.5 text-sm font-bold mb-1 ${config.labelClassName}`}>
        {config.icon}
        {config.label}
        {editable && onRemove && (
          <button
            onClick={onRemove}
            className="ml-auto text-gray-400 hover:text-gray-600 touch-manipulation p-3 min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {editable ? (
        <textarea
          value={block.content}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="内容を入力..."
          rows={2}
          aria-label="ハイライト内容を入力"
          className="w-full text-base bg-transparent resize-none outline-none text-gray-700 placeholder-gray-400"
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{block.content}</p>
      )}
    </div>
  );
}

interface AddHighlightButtonProps {
  onAdd: (type: HighlightType) => void;
}

export function AddHighlightButton({ onAdd }: AddHighlightButtonProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {(Object.entries(CONFIG) as [HighlightType, typeof CONFIG[HighlightType]][]).map(
        ([type, cfg]) => (
          <button
            key={type}
            onClick={() => onAdd(type)}
            className={`inline-flex items-center gap-1 text-sm px-3 py-2 border rounded-md ${cfg.className} ${cfg.labelClassName} touch-manipulation hover:opacity-80`}
          >
            {cfg.icon}
            {cfg.label}を追加
          </button>
        )
      )}
    </div>
  );
}
