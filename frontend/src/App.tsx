import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { CategoryExplorerView } from './views/CategoryExplorerView';
import { NoteView } from './views/NoteView';
import { NoteEditView } from './views/NoteEditView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  return (
    <BrowserRouter basename="/contents/sm">
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/lp" element={<LandingView />} />
        <Route path="/app"       element={<DashboardView />} />
        <Route path="/favorites" element={<DashboardView />} />
        <Route path="/notes"     element={<DashboardView />} />
        <Route path="/tags"      element={<DashboardView />} />
        <Route path="/settings"  element={<SettingsView />} />
        <Route path="/categories" element={<CategoryExplorerView />} />
        <Route path="/categories/:categoryId" element={<CategoryExplorerView />} />
        <Route path="/notes/:noteId" element={<NoteView />} />
        <Route path="/notes/:noteId/edit" element={<NoteEditView />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
