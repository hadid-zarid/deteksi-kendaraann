import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { historyService } from '../utils/history_service';

export default function HistoryPage() {
  const [histories, setHistories] = useState([]);

  useEffect(() => {
    setHistories(historyService.getAll());
  }, []);

  const clearHistory = () => {
    if (window.confirm("Yakin ingin menghapus seluruh riwayat?")) {
      historyService.clear();
      setHistories([]);
    }
  };

  return (
    <div className="clean-card" style={{maxWidth: '800px', margin: '0 auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2 style={{color: 'var(--text-main)', fontSize: '1.5rem'}}>Riwayat Deteksi</h2>
        {histories.length > 0 && (
          <button 
            onClick={clearHistory}
            style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}
          >
            <Trash2 size={18} /> Bersihkan
          </button>
        )}
      </div>

      {histories.length === 0 ? (
        <div style={{textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)'}}>
          <p>Belum ada riwayat deteksi yang tersimpan.</p>
        </div>
      ) : (
        <div>
          {histories.map(item => (
            <div key={item.id} className="history-item">
              <img src={item.image} alt="Deteksi" className="history-img" />
              <div className="history-content">
                <h4>{new Date(item.date).toLocaleString('id-ID')}</h4>
                <p style={{fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem'}}>Total: {item.total} Kendaraan</p>
                <p>{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
