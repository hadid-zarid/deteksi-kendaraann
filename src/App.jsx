import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Scan, History, Home } from 'lucide-react';

import LandingPage from './pages/LandingPage';
import ScannerPage from './pages/ScannerPage';
import HistoryPage from './pages/HistoryPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Toaster position="top-right" />
        
        <nav className="navbar">
          <NavLink to="/" className="nav-brand">
            <Scan size={24} />
            Deteksi AI Web
          </NavLink>
          
          <div className="nav-links">
            <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Home size={18} /> Beranda
            </NavLink>
            <NavLink to="/scan" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Scan size={18} /> Deteksi
            </NavLink>
            <NavLink to="/history" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <History size={18} /> Riwayat
            </NavLink>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/scan" element={<ScannerPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
