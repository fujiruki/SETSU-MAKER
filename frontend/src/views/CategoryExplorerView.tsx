import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Folder, FolderOpen, FileText, ChevronRight, Plus, MoreVertical, Pencil, Move, Trash2, X, FolderInput, Clock, Star, Tag } from 'lucide-react';
import type { Category, NoteListItem } from '../models/types';
import { categoryRepo, noteRepo } from '../repositories/ApiNoteRepository';
import { useCategoryTreeViewModel } from '../viewmodels/useCategoryTreeViewModel';

export function CategoryExplorerView() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const { expandedIds, toggle } = useCategoryTreeViewModel(categories, categoryId);
  const [addingName, setAddingName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ note: NoteListItem; x: number; y: number } | null>(null);
  const [noteMoveTarget, setNoteMoveTarget] = useState<NoteListItem | null>(null);

  const loadCategories = useCallback(() => {
    categoryRepo.getAll().then(setCategories).catch(console.error);
  }, []);

  const loadNotes = useCallback(() => {
    noteRepo.getList(categoryId).then(setNotes).catch(console.error);
  }, [categoryId]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, []);

  const handleAddCategory = async () => {
    if (!addingName.trim()) return;
    await categoryRepo.create(addingName.trim(), addParentId);
    setAddingName('');
    setShowAddModal(false);
    if (addParentId) toggle(addParentId);
    loadCategories();
  };

  const handleRename = async () => {
    if (!renameTarget?.name.trim()) return;
    await categoryRepo.update(renameTarget.id, { name: renameTarget.name.trim() });
    setRenameTarget(null);
    loadCategories();
  };

  const handleMove = async (targetId: string | null) => {
    if (!moveTarget) return;
    const isDescendant = (id: string): boolean => {
      const children = categories.filter((c) => c.parentId === id);
      return children.some((c) => c.id === targetId || isDescendant(c.id));
    };
    if (targetId === moveTarget.id || (targetId !== null && isDescendant(moveTarget.id))) return;
    await categoryRepo.update(moveTarget.id, { parentId: targetId });
    setMoveTarget(null);
    loadCategories();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const getAllDescendants = (id: string): string[] => {
      const children = categories.filter((c) => c.parentId === id);
      return [id, ...children.flatMap((c) => getAllDescendants(c.id))];
    };
    const toDelete = getAllDescendants(deleteTarget.id);
    for (const id of toDelete) {
      await categoryRepo.delete(id).catch(console.error);
    }
    setDeleteTarget(null);
    if (categoryId && toDelete.includes(categoryId)) navigate('/categories');
    loadCategories();
  };

  const handleNoteMove = async (targetCategoryId: string) => {
    if (!noteMoveTarget) return;
    const full = await noteRepo.getById(noteMoveTarget.id);
    if (full) await noteRepo.update({ ...full, categoryId: targetCategoryId });
    setNoteMoveTarget(null);
    loadNotes();
  };

  const handleNoteDelete = async (note: NoteListItem) => {
    await noteRepo.delete(note.id);
    setContextMenu(null);
    loadNotes();
  };

  const UNCATEGORIZED_ID = 'uncategorized';
  const rootCategories = categories.filter((c) => c.parentId === null && c.id !== UNCATEGORIZED_ID);
  const uncategorized = categories.find((c) => c.id === UNCATEGORIZED_ID);
  const selectedCategory = categoryId ? categories.find((c) => c.id === categoryId) : null;

  const treeProps = { allCategories: categories, expandedIds, selectedId: categoryId, onToggle: toggle,
    onRename: (id: string, name: string) => setRenameTarget({ id, name }),
    onMove: (cat: Category) => setMoveTarget(cat),
    onDelete: (cat: Category) => setDeleteTarget(cat) };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link to="/app" className="text-xl font-bold text-gray-800 tracking-tight">
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
          <button
            onClick={() => { setAddParentId(categoryId ?? null); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 touch-manipulation"
          >
            <Plus size={15} />
            カテゴリ追加
          </button>
          <Link
            to="/notes/new/edit"
            state={categoryId ? { initialCategoryId: categoryId } : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation"
          >
            <Plus size={15} />
            ノート作成
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden md:flex w-64 bg-white border-r border-gray-200 overflow-y-auto flex-col shrink-0">
          <div className="py-2">
            <NavItem to="/app"        icon={<Clock size={16} />}      label="最近のノート" />
            <NavItem to="/favorites"  icon={<Star size={16} />}       label="お気に入り" />
            <NavItem to="/categories" icon={<FolderOpen size={16} />} label="カテゴリ" active />
            <NavItem to="/tags"       icon={<Tag size={16} />}        label="タグ" />
            <NavItem to="/notes"      icon={<FileText size={16} />}   label="すべてのノート" />
          </div>
          <div className="border-t border-gray-200 py-2 flex-1">
            {rootCategories.map((cat) => (
              <CategoryTreeNode key={cat.id} category={cat} depth={0} {...treeProps} />
            ))}
            {uncategorized && (
              <CategoryTreeNode key={uncategorized.id} category={uncategorized} depth={0} {...treeProps} />
            )}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {!selectedCategory && (
            <div className="md:hidden mb-4">
              {rootCategories.map((cat) => (
                <CategoryTreeNode key={cat.id} category={cat} depth={0} {...treeProps} />
              ))}
              {uncategorized && (
                <CategoryTreeNode key={uncategorized.id} category={uncategorized} depth={0} {...treeProps} />
              )}
            </div>
          )}

          {selectedCategory ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">{selectedCategory.name}</h2>
                {selectedCategory.id !== UNCATEGORIZED_ID && (
                  <>
                    <button onClick={() => setRenameTarget({ id: selectedCategory.id, name: selectedCategory.name })} className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setMoveTarget(selectedCategory)} className="text-gray-400 hover:text-blue-500 p-1 touch-manipulation">
                      <Move size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(selectedCategory)} className="text-gray-400 hover:text-red-500 p-1 touch-manipulation">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
              <SubCategoryGrid categories={categories.filter((c) => c.parentId === categoryId)} />
            </>
          ) : (
            <h2 className="hidden md:block text-lg font-semibold text-gray-800 mb-4">すべてのカテゴリ</h2>
          )}

          {notes.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6">ノート</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onContextMenu={(note, x, y) => setContextMenu({ note, x, y })}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x, minWidth: '180px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setNoteMoveTarget(contextMenu.note); setContextMenu(null); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FolderInput size={15} className="text-blue-500" />
            他のカテゴリへ移動
          </button>
          <button
            onClick={() => handleNoteDelete(contextMenu.note)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
          >
            <Trash2 size={15} />
            ゴミ箱へ移動
          </button>
        </div>
      )}

      {/* カテゴリ追加モーダル */}
      {showAddModal && (
        <Modal title="カテゴリを追加" onClose={() => setShowAddModal(false)}>
          <p className="text-sm text-gray-500 mb-3">
            {addParentId
              ? `「${categories.find((c) => c.id === addParentId)?.name}」の下に追加`
              : 'トップレベルに追加'}
          </p>
          <input
            type="text"
            value={addingName}
            onChange={(e) => setAddingName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="カテゴリ名"
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
            <button onClick={handleAddCategory} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">追加</button>
          </div>
        </Modal>
      )}

      {/* リネームモーダル */}
      {renameTarget && (
        <Modal title="カテゴリ名を変更" onClose={() => setRenameTarget(null)}>
          <input
            type="text"
            value={renameTarget.name}
            onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setRenameTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
            <button onClick={handleRename} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">保存</button>
          </div>
        </Modal>
      )}

      {/* カテゴリ移動モーダル */}
      {moveTarget && (
        <Modal title={`「${moveTarget.name}」の移動先を選択`} onClose={() => setMoveTarget(null)}>
          <div className="mb-3 max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
            <button
              onClick={() => handleMove(null)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100"
            >
              <Folder size={15} className="text-gray-400" />
              トップレベル（親なし）
            </button>
            {categories.filter((c) => c.id !== moveTarget.id).map((c) => (
              <button
                key={c.id}
                onClick={() => handleMove(c.id)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-0"
              >
                <Folder size={15} className="text-amber-400" />
                {c.name}
              </button>
            ))}
          </div>
          <button onClick={() => setMoveTarget(null)} className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
        </Modal>
      )}

      {/* カテゴリ削除確認モーダル */}
      {deleteTarget && (
        <Modal title="カテゴリを削除" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600 mb-2">「<strong>{deleteTarget.name}</strong>」を削除しますか？</p>
          <p className="text-xs text-red-500 mb-5">子カテゴリもすべて削除されます。この操作は取り消せません。</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">削除する</button>
          </div>
        </Modal>
      )}

      {/* ノートのカテゴリ移動モーダル */}
      {noteMoveTarget && (
        <Modal title={`「${noteMoveTarget.title || '無題'}」の移動先`} onClose={() => setNoteMoveTarget(null)}>
          <div className="mb-3 max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => handleNoteMove(c.id)}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 ${
                  c.id === noteMoveTarget.categoryId
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Folder size={15} className="text-amber-400 shrink-0" />
                {c.name}
              </button>
            ))}
          </div>
          <button onClick={() => setNoteMoveTarget(null)} className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
        </Modal>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <BottomNavItem to="/app"        icon={<Clock size={20} />}      label="最近" />
        <BottomNavItem to="/favorites"  icon={<Star size={20} />}       label="お気に入り" />
        <BottomNavItem to="/categories" icon={<FolderOpen size={20} />} label="カテゴリ" active />
        <BottomNavItem to="/notes"      icon={<FileText size={20} />}   label="すべて" />
      </nav>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-md mx-2 touch-manipulation ${
        active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function BottomNavItem({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs touch-manipulation ${
        active ? 'text-blue-600' : 'text-gray-500'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function CategoryTreeNode({
  category, allCategories, expandedIds, selectedId, onToggle, onRename, onMove, onDelete, depth,
}: {
  category: Category;
  allCategories: Category[];
  expandedIds: Set<string>;
  selectedId?: string;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onMove: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  depth: number;
}) {
  const [showActions, setShowActions] = useState(false);
  const children = allCategories.filter((c) => c.parentId === category.id);
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showActions) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActions]);

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-2 rounded-lg mx-2 touch-manipulation ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
      >
        {children.length > 0 ? (
          <button onClick={() => onToggle(category.id)} className="p-0.5 text-gray-400 shrink-0">
            <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <Link to={`/categories/${category.id}`} className="flex items-center gap-1.5 flex-1 text-sm min-w-0">
          {isExpanded ? <FolderOpen size={15} className="shrink-0" /> : <Folder size={15} className="shrink-0" />}
          <span className="truncate">{category.name}</span>
        </Link>
        {category.id !== 'uncategorized' && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowActions((v) => !v)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 touch-manipulation rounded"
            >
              <MoreVertical size={14} />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden" style={{ minWidth: '140px' }}>
                <button
                  onClick={() => { setShowActions(false); onRename(category.id, category.name); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={14} className="text-gray-400" />名前を変更
                </button>
                <button
                  onClick={() => { setShowActions(false); onMove(category); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Move size={14} className="text-gray-400" />移動
                </button>
                <button
                  onClick={() => { setShowActions(false); onDelete(category); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />削除
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {isExpanded && children.map((child) => (
        <CategoryTreeNode
          key={child.id}
          category={child}
          allCategories={allCategories}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onToggle={onToggle}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
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

function NoteCard({
  note,
  onContextMenu,
}: {
  note: NoteListItem;
  onContextMenu: (note: NoteListItem, x: number, y: number) => void;
}) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(note, e.clientX, e.clientY);
  };

  return (
    <div className="relative" onContextMenu={handleContextMenu}>
      <Link
        to={`/notes/${note.id}`}
        className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow active:scale-95 touch-manipulation"
      >
        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
          {note.eyecatchUrl ? (
            <img src={note.eyecatchUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <FileText size={32} className="text-gray-300" />
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-gray-800 line-clamp-2">{note.title || '無題'}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(note.updatedAt).toLocaleDateString('ja-JP')}
          </p>
        </div>
      </Link>
    </div>
  );
}
