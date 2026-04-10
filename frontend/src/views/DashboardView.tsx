import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Star, Clock, FolderOpen, Tag, FileText, Settings, X } from 'lucide-react';
import type { NoteListItem, Tag as TagType } from '../models/types';
import { noteRepo, tagRepo } from '../repositories/ApiNoteRepository';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel';

export function DashboardView() {
  const { pathname } = useLocation();
  const { activeSection, activeNavItem } = useDashboardViewModel(pathname);

  const [searchQuery, setSearchQuery] = useState('');
  const [recentNotes, setRecentNotes] = useState<NoteListItem[]>([]);
  const [favoriteNotes, setFavoriteNotes] = useState<NoteListItem[]>([]);
  const [allNotes, setAllNotes] = useState<NoteListItem[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<NoteListItem[]>([]);

  useEffect(() => {
    noteRepo.getRecent(20).then(setRecentNotes).catch(console.error);
    noteRepo.getFavorites().then(setFavoriteNotes).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeSection === 'all') {
      noteRepo.getList().then(setAllNotes).catch(console.error);
    }
    if (activeSection === 'tags') {
      tagRepo.getAll().then(setTags).catch(console.error);
    }
  }, [activeSection]);

  const fetchFilteredNotes = useCallback(() => {
    if (!selectedTagId) { setFilteredNotes([]); return; }
    const params: { tagId?: string; q?: string } = { tagId: selectedTagId };
    if (noteSearchQuery.trim()) params.q = noteSearchQuery.trim();
    noteRepo.getList(params).then(setFilteredNotes).catch(console.error);
  }, [selectedTagId, noteSearchQuery]);

  useEffect(() => {
    fetchFilteredNotes();
  }, [fetchFilteredNotes]);

  const displayedTags = tagSearchQuery.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    : tags;

  const selectedTagName = tags.find((t) => t.id === selectedTagId)?.name;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link to="/app" className="text-xl font-bold text-gray-800 tracking-tight hover:text-blue-600 transition-colors">
          SETSU-MAKER
        </Link>
        <Link to="/" className="text-xs text-gray-400 hover:text-blue-500 transition-colors border border-gray-200 rounded py-2 px-3">
          このアプリについて
        </Link>
        <div className="flex-1 relative max-w-md ml-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="ノートを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-base border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <Link
          to="/notes/new/edit"
          className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
        >
          ＋ 新しいノート
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col py-2 shrink-0">
          <NavItem to="/app"       icon={<Clock size={16} />}     label="最近のノート"  active={activeNavItem === '/app'} />
          <NavItem to="/favorites" icon={<Star size={16} />}      label="お気に入り"    active={activeNavItem === '/favorites'} />
          <NavItem to="/categories" icon={<FolderOpen size={16} />} label="カテゴリ"   active={false} />
          <NavItem to="/tags"      icon={<Tag size={16} />}       label="タグ"         active={activeNavItem === '/tags'} />
          <NavItem to="/notes"     icon={<FileText size={16} />}  label="すべてのノート" active={activeNavItem === '/notes'} />
          <div className="flex-1" />
          <NavItem to="/settings"  icon={<Settings size={16} />}  label="設定"          active={false} />
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {activeSection === 'recent' && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">最近のノート</h2>
              <NoteGrid notes={recentNotes} />
            </section>
          )}
          {activeSection === 'favorites' && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">お気に入り</h2>
              <NoteGrid notes={favoriteNotes} />
            </section>
          )}
          {activeSection === 'all' && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">すべてのノート</h2>
              <NoteGrid notes={allNotes} />
            </section>
          )}
          {activeSection === 'tags' && (
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">タグ</h2>
                <div className="relative max-w-xs mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder="タグを検索..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-base border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-400">タグがありません</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {displayedTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                        className={`px-3 py-1.5 text-sm rounded-full touch-manipulation transition-colors ${
                          selectedTagId === tag.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    ))}
                    {displayedTags.length === 0 && (
                      <p className="text-sm text-gray-400">一致するタグがありません</p>
                    )}
                  </div>
                )}
              </div>

              {selectedTagId && (
                <div className="mt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-500">
                        #{selectedTagName}
                      </span>
                      <button
                        onClick={() => setSelectedTagId(null)}
                        className="text-gray-400 hover:text-gray-600 p-3 min-w-[48px] min-h-[48px] flex items-center justify-center touch-manipulation"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="relative flex-1 max-w-xs">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        placeholder="ノートを絞り込み..."
                        value={noteSearchQuery}
                        onChange={(e) => setNoteSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-base border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                    <span className="text-sm text-gray-400">{filteredNotes.length}件</span>
                  </div>
                  <NoteGrid notes={filteredNotes} />
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <BottomNavItem to="/app"       icon={<Clock size={20} />}    label="最近"      active={activeNavItem === '/app'} />
        <BottomNavItem to="/favorites" icon={<Star size={20} />}     label="お気に入り" active={activeNavItem === '/favorites'} />
        <BottomNavItem to="/categories" icon={<FolderOpen size={20} />} label="カテゴリ" active={false} />
        <BottomNavItem to="/tags"      icon={<Tag size={20} />}      label="タグ"      active={activeNavItem === '/tags'} />
        <BottomNavItem to="/notes"     icon={<FileText size={20} />} label="すべて"    active={activeNavItem === '/notes'} />
      </nav>
    </div>
  );
}

function NoteGrid({ notes }: { notes: NoteListItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {notes.length === 0 && (
        <p className="text-sm text-gray-400 col-span-full">ノートがありません</p>
      )}
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

function BottomNavItem({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
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

function NavItem({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-md mx-2 touch-manipulation ${
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </Link>
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
        <p className="text-sm text-gray-400 mt-1">
          {new Date(note.updatedAt).toLocaleDateString('ja-JP')}
        </p>
      </div>
    </Link>
  );
}
