import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import type { Tag } from '../models/types';

interface TagInputProps {
  selectedTagIds: string[];
  allTags: Tag[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
}

export function TagInput({ selectedTagIds, allTags, onAdd, onRemove, onCreateTag }: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));
  const suggestions = allTags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      t.name.includes(input)
  );

  const handleSelect = (tag: Tag) => {
    onAdd(tag.id);
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const existing = allTags.find((t) => t.name === input.trim());
      if (existing) {
        handleSelect(existing);
      } else if (onCreateTag) {
        const created = await onCreateTag(input.trim());
        onAdd(created.id);
        setInput('');
        setShowSuggestions(false);
      }
    }
    if (e.key === 'Backspace' && !input && selectedTagIds.length > 0) {
      onRemove(selectedTagIds[selectedTagIds.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg bg-white min-h-[40px] cursor-text"
        onClick={() => inputRef.current?.focus()}>
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-sm rounded-full"
          >
            #{tag.name}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(tag.id); }}
              className="hover:text-blue-900 touch-manipulation"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTagIds.length === 0 ? 'タグを追加...' : ''}
          className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
        />
      </div>

      {showSuggestions && input && suggestions.length > 0 && (
        <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                onMouseDown={() => handleSelect(tag)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 touch-manipulation"
              >
                #{tag.name}
              </button>
            </li>
          ))}
          {onCreateTag && !allTags.find((t) => t.name === input.trim()) && (
            <li>
              <button
                onMouseDown={async () => {
                  const created = await onCreateTag(input.trim());
                  onAdd(created.id);
                  setInput('');
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 touch-manipulation"
              >
                「{input}」を新規作成
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
