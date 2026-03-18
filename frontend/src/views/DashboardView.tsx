import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Clock, FolderOpen, Tag, FileText } from 'lucide-react';
import type { NoteListItem } from '../models/types';

const MOCK_RECENT: NoteListItem[] = [
  {
    id: 'n1',
    title: '引き戸の建て込み手順',
    categoryId: 'cat-2',
    tagIds: [],
    eyecatchUrl: null,
    isFavorite: true,
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'n2',
    title: '框の組み立て',
    categoryId: 'cat-1',
    tagIds: [],
    eyecatchUrl: null,
    isFavorite: false,
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-03-12T00:00:00Z',
  },
];

export function DashboardView() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">SETSU-MAKER</h1>
        <div className="flex-1 relative max-w-md ml-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="ノートを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
        <nav className="w-56 bg-white border-r border-gray-200 flex flex-col py-2 shrink-0">
          <NavItem to="/" icon={<Clock size={16} />} label="最近のノート" active />
          <NavItem to="/favorites" icon={<Star size={16} />} label="お気に入り" />
          <NavItem to="/categories" icon={<FolderOpen size={16} />} label="カテゴリ" />
          <NavItem to="/tags" icon={<Tag size={16} />} label="タグ" />
          <NavItem to="/notes" icon={<FileText size={16} />} label="すべてのノート" />
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              最近のノート
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {MOCK_RECENT.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              お気に入り
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {MOCK_RECENT.filter((n) => n.isFavorite).map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
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
        <p className="text-xs text-gray-400 mt-1">
          {new Date(note.updatedAt).toLocaleDateString('ja-JP')}
        </p>
      </div>
    </Link>
  );
}
