export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeAnnotation {
  id: string;
  type: 'arrow' | 'text';
  data: Record<string, unknown>;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  annotations: ShapeAnnotation[];
  cropRegion: CropRegion | null;
  takenAt: string | null;
  createdAt: string;
  order: number;
}

export type HighlightType = 'warning' | 'point' | 'note';

export interface HighlightBlock {
  id: string;
  type: HighlightType;
  content: string;
}

export interface Step {
  id: string;
  order: number;
  title: string;
  description: string;
  highlights: HighlightBlock[];
  photos: Photo[];
  hint: string;
}

export interface Note {
  id: string;
  title: string;
  categoryId: string;
  tagIds: string[];
  steps: Step[];
  unassignedPhotos: Photo[];
  eyecatchPhotoId: string | null;
  handwritingData: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  categoryId: string;
  tagIds: string[];
  eyecatchUrl: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}
