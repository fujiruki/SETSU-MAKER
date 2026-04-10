import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Edit2, BookOpen, Star, ArrowLeft, Share2 } from 'lucide-react';
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
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) return;
    noteRepo.getById(noteId).then(setNote).catch(console.error);
  }, [noteId]);

  useEffect(() => {
    tagRepo.getAll().then(setAllTags).catch(console.error);
    categoryRepo.getAll().then(setCategories).catch(console.error);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleShare = useCallback(async () => {
    if (!note) return;
    const lines: string[] = [`【${note.title}】`, ''];
    note.steps.forEach((step, i) => {
      lines.push(`■ 工程${i + 1}: ${step.title}`);
      if (step.description) lines.push(step.description);
      lines.push('');
      for (const h of step.highlights) {
        const icon = h.type === 'warning' ? '⚠️' : h.type === 'point' ? '💡' : '📝';
        lines.push(`${icon} ${h.content}`);
      }
      if (step.highlights.length > 0) lines.push('');
      if (step.hint) {
        lines.push(`💡ヒント: ${step.hint}`);
        lines.push('');
      }
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n').trimEnd());
      showToast('クリップボードにコピーしました');
    } catch {
      showToast('コピーに失敗しました');
    }
  }, [note, showToast]);

  const handleToggleFavorite = useCallback(async () => {
    if (!note || !noteId) return;
    const newFav = !note.isFavorite;
    setNote({ ...note, isFavorite: newFav });
    try {
      await noteRepo.update({ ...note, isFavorite: newFav });
      showToast(newFav ? 'お気に入りに追加しました' : 'お気に入りを解除しました');
    } catch {
      setNote({ ...note, isFavorite: !newFav });
      showToast('更新に失敗しました');
    }
  }, [note, noteId, showToast]);

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
              <span className="hidden sm:inline">ヒント編集</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border touch-manipulation border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <Share2 size={15} />
              <span className="hidden sm:inline">共有</span>
            </button>
            <button
              onClick={() => navigate(`/notes/${noteId}/edit`, { state: { note } })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border touch-manipulation border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <Edit2 size={15} />
              <span className="hidden sm:inline">編集</span>
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
              <button
                onClick={handleToggleFavorite}
                className="p-2 -m-1 touch-manipulation rounded-full hover:bg-yellow-50 active:scale-90 transition-transform"
                title={note.isFavorite ? 'お気に入りを解除' : 'お気に入りに追加'}
              >
                <Star
                  size={20}
                  className={`transition-colors ${note.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                />
              </button>
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
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-[5vmin]"
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxPhoto(null); }}
        >
          <div
            className="relative flex flex-col items-center"
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
          >
            {lightboxPhoto.mediaType === 'video' ? (
              <video
                src={lightboxPhoto.url}
                controls
                playsInline
                autoPlay
                className="rounded-lg"
                style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={lightboxPhoto.thumbnailUrl || lightboxPhoto.url}
                alt=""
                className="rounded-lg"
                style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
              />
            )}
            <button
              onClick={() => setLightboxPhoto(null)}
              className="mt-3 px-6 py-2 bg-white/90 border border-gray-200 rounded-full text-sm hover:bg-white touch-manipulation"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeInUp_0.3s_ease-out]">
          <div className="bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
