import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource/familjen-grotesk/500.css';
import '@fontsource/familjen-grotesk/700.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Hash routing: GitHub Pages has no server rewrites, so /#/places survives a refresh. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
