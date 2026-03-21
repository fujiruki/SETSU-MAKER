import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Edit2, BookOpen, Star, ArrowLeft } from 'lucide-react';
import { StepCard } from '../components/StepCard';
import type { Note, Tag, Category, Photo } from '../models/types';
import { noteRepo, categoryRepo, tagRepo } from '../repositories/ApiNoteRepository';

type ViewMode = 'view' | 'hint';

export function NoteView() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>('view');
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!noteId) return;
    noteRepo.getById(noteId).then(setNote).catch(console.error);
  }, [noteId]);

  useEffect(() => {
    tagRepo.getAll().then(setAllTags).catch(console.error);
    categoryRepo.getAll().then(setCategories).catch(console.error);
  }, []);

  if (!note) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  const tags = allTags.filter((t) => note.tagIds.includes(t.id));

  const getBreadcrumb = (categoryId: string): Category[] => {
    const path: Category[] = [];
    let current = categories.find((c) => c.id === categoryId);
    while (current) {
      path.unshift(current);
      current = current.parentId
        ? categories.find((c) => c.id === current!.parentId)
        : undefined;
    }
    return path;
  };
  const breadcrumb = getBreadcrumb(note.categoryId);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-2">
          <Link to="/app" className="text-gray-400 hover:text-gray-600 touch-manipulation p-3 -ml-2">
            <ArrowLeft size={20} />
          </Link>

          <nav className="flex items-center gap-1 text-sm text-gray-500 flex-1 min-w-0 overflow-hidden">
            {breadcrumb.map((cat, i) => (
              <span key={cat.id} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight size={14} className="shrink-0" />}
                <Link to={`/categories/${cat.id}`} className="hover:text-gray-700 truncate">
                  {cat.name}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMode(mode === 'hint' ? 'view' : 'hint')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border touch-manipulation ${
                mode === 'hint'
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <BookOpen size={15} />
              ヒント編集
            </button>
            <button
              onClick={() => navigate(`/notes/${noteId}/edit`, { state: { note } })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border touch-manipulation border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <Edit2 size={15} />
              編集
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 py-4 flex-1">
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>作成日: {new Date(note.createdAt).toLocaleDateString('ja-JP')}</span>
            <div className="flex items-center gap-2">
              <span>更新日: {new Date(note.updatedAt).toLocaleDateString('ja-JP')}</span>
              <Star
                size={16}
                className={note.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">{note.title}</h1>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-sm rounded-full"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {note.steps.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              editable={false}
              hintEditable={mode === 'hint'}
              onUpdate={() => {}}
              onRemove={() => {}}
              onAddHighlight={() => {}}
              onUpdateHighlight={() => {}}
              onRemoveHighlight={() => {}}
              onAddPhotos={() => {}}
              onPhotoClick={setLightboxPhoto}
            />
          ))}
        </div>
      </div>

      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 max-w-2xl w-full">
            <img src={lightboxPhoto.url} alt="" className="w-full rounded-lg" />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="mt-3 w-full py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
