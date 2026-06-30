const HISTORY_KEY = 'deteksi_kendaraan_history';

export const historyService = {
  getAll: () => {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Gagal membaca riwayat:", e);
      return [];
    }
  },

  save: (historyItem) => {
    try {
      const histories = historyService.getAll();
      
      const newItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        ...historyItem
      };
      
      // Simpan di paling atas (terbaru)
      histories.unshift(newItem);
      
      // Limit to 50 items agar localStorage tidak penuh
      if (histories.length > 50) {
        histories.pop();
      }
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
      return true;
    } catch (e) {
      console.error("Gagal menyimpan riwayat:", e);
      return false;
    }
  },
  
  clear: () => {
    localStorage.removeItem(HISTORY_KEY);
  }
};
