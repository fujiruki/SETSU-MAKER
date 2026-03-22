import type { Note, NoteListItem, Tag, Category } from '../models/types';
import type { NoteRepository, CategoryRepository, TagRepository } from './types';

const BASE = '/contents/sm/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const override = method === 'PUT' || method === 'DELETE';
  const needsBody = method === 'POST' || method === 'PUT' || method === 'DELETE';
  const headers: Record<string, string> = {};
  if (needsBody) headers['Content-Type'] = 'application/json';
  if (override) headers['X-HTTP-Method-Override'] = method;
  const res = await fetch(BASE + path, {
    ...init,
    method: override ? 'POST' : method,
    headers,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ─── NoteRepository ───────────────────────────────────────────

export class ApiNoteRepository implements NoteRepository {
  async getList(params?: { categoryId?: string; tagId?: string; q?: string }): Promise<NoteListItem[]> {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.tagId) query.set('tagId', params.tagId);
    if (params?.q) query.set('q', params.q);
    return apiFetch<NoteListItem[]>(`/notes?${query}`);
  }

  async getById(id: string): Promise<Note | null> {
    try {
      return await apiFetch<Note>(`/notes/${id}`);
    } catch {
      return null;
    }
  }

  async getRecent(limit = 20): Promise<NoteListItem[]> {
    return apiFetch<NoteListItem[]>(`/notes?limit=${limit}`);
  }

  async getFavorites(): Promise<NoteListItem[]> {
    return apiFetch<NoteListItem[]>('/notes?favorite=1');
  }

  async search(query: string): Promise<NoteListItem[]> {
    return apiFetch<NoteListItem[]>(`/notes?q=${encodeURIComponent(query)}`);
  }

  async create(categoryId: string, title: string): Promise<Note> {
    return apiFetch<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ categoryId, title }),
    });
  }

  async update(note: Note): Promise<Note> {
    return apiFetch<Note>(`/notes/${note.id}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    });
  }

  async delete(id: string): Promise<void> {
    await apiFetch(`/notes/${id}`, { method: 'DELETE' });
  }

  async toggleFavorite(id: string): Promise<void> {
    const note = await this.getById(id);
    if (!note) return;
    await this.update({ ...note, isFavorite: !note.isFavorite });
  }

  async uploadPhoto(noteId: string, stepId: string, file: File, thumbnail?: File): Promise<{ url: string; thumbnailUrl: string | null; takenAt: string | null }> {
    const form = new FormData();
    form.append('photo', file);
    if (thumbnail) form.append('thumbnail', thumbnail);
    const res = await fetch(`${BASE}/notes/${noteId}/steps/${stepId}/photos`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return {
      url: data.url as string,
      thumbnailUrl: (data.thumbnailUrl as string | null) ?? null,
      takenAt: (data.takenAt as string | null) ?? null,
    };
  }
}

// ─── CategoryRepository ───────────────────────────────────────

export class ApiCategoryRepository implements CategoryRepository {
  async getAll(): Promise<Category[]> {
    return apiFetch<Category[]>('/categories');
  }

  async getById(_id: string): Promise<Category | null> {
    const all = await this.getAll();
    return all.find((c) => c.id === _id) ?? null;
  }

  async create(name: string, parentId: string | null): Promise<Category> {
    return apiFetch<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    });
  }

  async update(id: string, patch: { name?: string; parentId?: string | null }): Promise<Category> {
    return apiFetch<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  }

  async delete(id: string): Promise<void> {
    await apiFetch(`/categories/${id}`, { method: 'DELETE' });
  }
}

// ─── TagRepository ────────────────────────────────────────────

export class ApiTagRepository implements TagRepository {
  async getAll(): Promise<Tag[]> {
    return apiFetch<Tag[]>('/tags');
  }

  async create(name: string): Promise<Tag> {
    return apiFetch<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async delete(id: string): Promise<void> {
    await apiFetch(`/tags/${id}`, { method: 'DELETE' });
  }

  async suggest(query: string): Promise<Tag[]> {
    return apiFetch<Tag[]>(`/tags?q=${encodeURIComponent(query)}`);
  }
}

// ─── シングルトン ─────────────────────────────────────────────

export const noteRepo = new ApiNoteRepository();
export const categoryRepo = new ApiCategoryRepository();
export const tagRepo = new ApiTagRepository();
