import type { Category, Note, NoteListItem, Tag } from '../models/types';

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(name: string, parentId: string | null): Promise<Category>;
  update(id: string, patch: { name?: string; parentId?: string | null }): Promise<Category>;
  delete(id: string): Promise<void>;
}

export interface TagRepository {
  getAll(): Promise<Tag[]>;
  create(name: string): Promise<Tag>;
  delete(id: string): Promise<void>;
  suggest(query: string): Promise<Tag[]>;
}

export interface NoteRepository {
  getList(categoryId?: string, tagId?: string): Promise<NoteListItem[]>;
  getById(id: string): Promise<Note | null>;
  getRecent(limit?: number): Promise<NoteListItem[]>;
  getFavorites(): Promise<NoteListItem[]>;
  search(query: string): Promise<NoteListItem[]>;
  create(categoryId: string, title: string): Promise<Note>;
  update(note: Note): Promise<Note>;
  delete(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
  uploadPhoto(noteId: string, stepId: string, file: File): Promise<{ url: string; takenAt: string | null }>;
}
