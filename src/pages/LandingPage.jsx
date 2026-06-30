import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Server } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-hero">
      <h1>Sistem Deteksi Kendaraan AI</h1>
      <p>Teknologi pemindaian canggih yang berjalan langsung di browser Anda. Aman, cepat, dan 100% lokal tanpa memerlukan server eksternal.</p>
      
      <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem'}}>
        <Link to="/scan" className="btn-primary" style={{textDecoration: 'none'}}>
          Mulai Pemindaian
        </Link>
        <Link to="/history" className="btn-outline" style={{textDecoration: 'none'}}>
          Lihat Riwayat
        </Link>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <Zap size={40} color="var(--primary)" />
          <h3>Super Cepat</h3>
          <p>Ditenagai oleh ONNX Runtime WebAssembly, membuat deteksi berjalan seketika di browser.</p>
        </div>
        <div className="feature-card">
          <ShieldCheck size={40} color="var(--primary)" />
          <h3>Aman & Privat</h3>
          <p>Gambar atau video Anda tidak pernah dikirim ke internet. Semua diproses di perangkat Anda.</p>
        </div>
        <div className="feature-card">
          <Server size={40} color="var(--primary)" />
          <h3>Multi Fitur</h3>
          <p>Mendukung pemindaian dari unggahan foto, cuplikan video, maupun Live Kamera langsung.</p>
        </div>
      </div>
    </div>
  );
}
