import { Route, Routes } from 'react-router-dom';
import TabBar from './components/TabBar';
import AskDialog from './components/AskDialog';
import Toaster from './components/Toaster';
import UpdatePrompt from './components/UpdatePrompt';
import MapPage from './pages/MapPage';
import PlacesPage from './pages/PlacesPage';
import LogPage from './pages/LogPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <div className="flex h-dvh flex-col">
      <main className="relative min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/places" element={<PlacesPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<MapPage />} />
        </Routes>
      </main>
      <TabBar />
      <AskDialog />
      <Toaster />
      <UpdatePrompt />
    </div>
  );
}
