import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Folder, FolderOpen, FileText, ChevronRight, Plus } from 'lucide-react';
import type { Category, NoteListItem } from '../models/types';

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '建具', parentId: null, order: 0 },
  { id: 'cat-2', name: '引き戸', parentId: 'cat-1', order: 0 },
  { id: 'cat-3', name: '障子', parentId: 'cat-1', order: 1 },
  { id: 'cat-4', name: '框組み', parentId: 'cat-2', order: 0 },
  { id: 'cat-5', name: '塗装', parentId: null, order: 1 },
];

const MOCK_NOTES: NoteListItem[] = [
  {
    id: 'n1',
    title: '引き戸の建て込み手順',
    categoryId: 'cat-2',
    tagIds: ['t1'],
    eyecatchUrl: null,
    isFavorite: true,
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'n2',
    title: '框の組み立て',
    categoryId: 'cat-4',
    tagIds: [],
    eyecatchUrl: null,
    isFavorite: false,
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-03-12T00:00:00Z',
  },
];

export function CategoryExplorerView() {
  const { categoryId } = useParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['cat-1']));

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const rootCategories = MOCK_CATEGORIES.filter((c) => c.parentId === null);
  const selectedNotes = categoryId
    ? MOCK_NOTES.filter((n) => n.categoryId === categoryId)
    : MOCK_NOTES;
  const selectedCategory = categoryId
    ? MOCK_CATEGORIES.find((c) => c.id === categoryId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-xl font-bold text-gray-800 tracking-tight">
          SETSU-MAKER
        </Link>
        <ChevronRight size={16} className="text-gray-400" />
        <span className="text-gray-600">カテゴリ</span>
        {selectedCategory && (
          <>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-600">{selectedCategory.name}</span>
          </>
        )}
        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 touch-manipulation">
            <Plus size={15} />
            カテゴリ追加
          </button>
          <Link
            to="/notes/new/edit"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation"
          >
            <Plus size={15} />
            ノート作成
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 bg-white border-r border-gray-200 overflow-y-auto py-2 shrink-0">
          {rootCategories.map((cat) => (
            <CategoryTreeNode
              key={cat.id}
              category={cat}
              allCategories={MOCK_CATEGORIES}
              expandedIds={expandedIds}
              selectedId={categoryId}
              onToggle={toggle}
              depth={0}
            />
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedCategory ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{selectedCategory.name}</h2>
              <SubCategoryGrid
                categories={MOCK_CATEGORIES.filter((c) => c.parentId === categoryId)}
              />
            </>
          ) : (
            <h2 className="text-lg font-semibold text-gray-800 mb-4">すべてのカテゴリ</h2>
          )}

          {selectedNotes.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6">
                ノート
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function CategoryTreeNode({
  category,
  allCategories,
  expandedIds,
  selectedId,
  onToggle,
  depth,
}: {
  category: Category;
  allCategories: Category[];
  expandedIds: Set<string>;
  selectedId?: string;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const children = allCategories.filter((c) => c.parentId === category.id);
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-2 rounded-lg mx-2 cursor-pointer touch-manipulation ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {children.length > 0 ? (
          <button
            onClick={() => onToggle(category.id)}
            className="p-0.5 text-gray-400"
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Link
          to={`/categories/${category.id}`}
          className="flex items-center gap-1.5 flex-1 text-sm"
        >
          {isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
          {category.name}
        </Link>
      </div>
      {isExpanded && children.map((child) => (
        <CategoryTreeNode
          key={child.id}
          category={child}
          allCategories={allCategories}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function SubCategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          to={`/categories/${cat.id}`}
          className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow touch-manipulation"
        >
          <FolderOpen size={32} className="text-amber-400" />
          <span className="text-sm font-medium text-gray-700">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}

function NoteCard({ note }: { note: NoteListItem }) {
  return (
    <Link
      to={`/notes/${note.id}`}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow active:scale-95 touch-manipulation"
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
        {note.eyecatchUrl ? (
          <img src={note.eyecatchUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <FileText size={32} className="text-gray-300" />
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-800 line-clamp-2">{note.title}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(note.updatedAt).toLocaleDateString('ja-JP')}
        </p>
      </div>
    </Link>
  );
}
