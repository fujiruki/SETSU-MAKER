import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardView } from './views/DashboardView';
import { CategoryExplorerView } from './views/CategoryExplorerView';
import { NoteView } from './views/NoteView';
import { NoteEditView } from './views/NoteEditView';

export default function App() {
  return (
    <BrowserRouter basename="/contents/sm">
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/categories" element={<CategoryExplorerView />} />
        <Route path="/categories/:categoryId" element={<CategoryExplorerView />} />
        <Route path="/notes/:noteId" element={<NoteView />} />
        <Route path="/notes/:noteId/edit" element={<NoteEditView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
