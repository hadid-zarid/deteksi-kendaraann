import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Video, UploadCloud, Play, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { onnxService } from '../utils/onnx_service';
import { historyService } from '../utils/history_service';

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState('photo'); // photo, video, live
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    onnxService.init().then(() => {
      setIsModelLoaded(true);
    }).catch(err => {
      console.error("Failed to init model", err);
    });
  }, []);

  return (
    <div className="clean-card" style={{animation: 'fadeInUp 0.5s ease-out'}}>
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'photo' ? 'active' : ''}`}
          onClick={() => setActiveTab('photo')}
        >
          <ImageIcon size={18} /> Foto
        </button>
        <button 
          className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          <Video size={18} /> Video
        </button>
        <button 
          className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <Camera size={18} /> Live Kamera
        </button>
      </div>

      {!isModelLoaded ? (
        <div style={{textAlign: 'center', padding: '4rem'}}>
          <div className="spinner" style={{margin: '0 auto 1rem'}}></div>
          <p style={{color: 'var(--text-muted)'}}>Memuat mesin kecerdasan buatan...</p>
        </div>
      ) : (
        <>
          {activeTab === 'photo' && <PhotoScanner />}
          {activeTab === 'video' && <VideoScanner />}
          {activeTab === 'live' && <LiveScanner />}
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// HELPERS & COMPONENTS
// -------------------------------------------------------------
function drawBoundingBoxes(mediaElement, canvas, detections) {
  if (!mediaElement || !canvas || !detections) return;
  const rect = mediaElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = { 'Mobil': '#3b82f6', 'Motor': '#10b981', 'Bus': '#f59e0b', 'Truk': '#ef4444', 'Unknown': '#6b7280' };

  detections.forEach(d => {
    const [xMin, yMin, xMax, yMax] = d.bbox;
    const x = xMin * canvas.width;
    const y = yMin * canvas.height;
    const w = (xMax - xMin) * canvas.width;
    const h = (yMax - yMin) * canvas.height;
    const color = colors[d.label] || colors['Unknown'];

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = color;
    const labelText = `${d.label} ${Math.round(d.confidence * 100)}%`;
    ctx.font = '600 14px Inter, sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    ctx.fillRect(x, Math.max(0, y - 24), textWidth + 12, 24);
    ctx.fillStyle = 'white';
    ctx.fillText(labelText, x + 6, Math.max(0, y - 24) + 16);
  });
}

function getCombinedCanvasDataUrl(mediaElement, detections) {
  const canvas = document.createElement('canvas');
  // Gunakan resolusi asli untuk disimpan
  const w = mediaElement.videoWidth || mediaElement.naturalWidth || mediaElement.width;
  const h = mediaElement.videoHeight || mediaElement.naturalHeight || mediaElement.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  
  // Draw base image
  ctx.drawImage(mediaElement, 0, 0, w, h);
  
  // Draw boxes
  const colors = { 'Mobil': '#3b82f6', 'Motor': '#10b981', 'Bus': '#f59e0b', 'Truk': '#ef4444', 'Unknown': '#6b7280' };
  detections.forEach(d => {
    const [xMin, yMin, xMax, yMax] = d.bbox;
    const x = xMin * w;
    const y = yMin * h;
    const boxW = (xMax - xMin) * w;
    const boxH = (yMax - yMin) * h;
    const color = colors[d.label] || colors['Unknown'];

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.strokeRect(x, y, boxW, boxH);
  });
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

// -------------------------------------------------------------
// PHOTO SCANNER
// -------------------------------------------------------------
function PhotoScanner() {
  const [imageSrc, setImageSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageSrc(URL.createObjectURL(file));
    setResult(null);
  };

  const scanImage = async () => {
    if (!imageRef.current) return;
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 100));
    const detections = await onnxService.detectImage(imageRef.current);
    if (detections) {
      setResult(detections);
      drawBoundingBoxes(imageRef.current, canvasRef.current, detections.detections);
    }
    setIsProcessing(false);
  };

  const saveHistory = () => {
    if (!result) return;
    const dataUrl = getCombinedCanvasDataUrl(imageRef.current, result.detections);
    const summary = Object.entries(result.count).filter(([k,v]) => v > 0).map(([k,v]) => `${k}: ${v}`).join(', ');
    
    historyService.save({
      image: dataUrl,
      total: result.total,
      summary: summary
    });
    toast.success('Berhasil disimpan ke Riwayat!');
  };

  return (
    <div>
      <div className={`scanner-area ${imageSrc ? 'has-content' : ''}`}>
        {!imageSrc ? (
          <>
            <label htmlFor="photo-upload" style={{cursor: 'pointer', textAlign: 'center', display: 'block', width: '100%', padding: '4rem 0'}}>
              <UploadCloud size={48} color="var(--primary)" style={{marginBottom: '1rem'}} />
              <h3 style={{marginBottom: '0.5rem', color: 'var(--text-main)'}}>Unggah Foto</h3>
              <p style={{color: 'var(--text-muted)'}}>Klik untuk memilih foto (JPG, PNG)</p>
            </label>
            <input type="file" id="photo-upload" accept="image/*" onChange={handleImageUpload} />
          </>
        ) : (
          <div style={{position: 'relative', width: '100%', display: 'flex', justifyContent: 'center'}}>
            <img ref={imageRef} src={imageSrc} alt="Preview" className="preview-image" />
            <canvas ref={canvasRef} className="detection-canvas" />
            {isProcessing && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Memindai Kendaraan...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {imageSrc && (
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem'}}>
          <button className="btn-primary" onClick={scanImage} disabled={isProcessing}>
            <ImageIcon size={18} /> {isProcessing ? 'Memproses...' : 'Mulai Deteksi'}
          </button>
          <button className="btn-outline" onClick={() => {setImageSrc(null); setResult(null);}}>Ganti Foto</button>
          {result && (
            <button className="btn-primary" style={{background: '#10b981'}} onClick={saveHistory}>
              <Save size={18} /> Simpan Riwayat
            </button>
          )}
        </div>
      )}
      {result && <ResultPanel result={result} />}
    </div>
  );
}

// -------------------------------------------------------------
// VIDEO SCANNER
// -------------------------------------------------------------
function VideoScanner() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [bestFrameSrc, setBestFrameSrc] = useState(null);
  
  const hiddenVideoRef = useRef(null);
  const bestCanvasRef = useRef(null);
  const displayCanvasRef = useRef(null);
  const displayImageRef = useRef(null);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoSrc(URL.createObjectURL(file));
    setResult(null); setBestFrameSrc(null); setProgress(0);
  };

  const scanVideo = async () => {
    if (!hiddenVideoRef.current) return;
    setIsProcessing(true);
    setProgress(0);
    const video = hiddenVideoRef.current;
    
    if (video.readyState < 2) await new Promise(r => { video.onloadeddata = r; });
    
    let totalSeconds = Math.max(1, Math.floor(video.duration));
    let step = Math.max(1, Math.ceil(totalSeconds / 10));
    
    let maxCounts = {};
    let maxTotal = 0;
    let bestDetections = [];
    let bestImageDataUrl = null;
    let framesToExtract = Math.ceil(totalSeconds / step);
    let framesProcessed = 0;

    for (let i = 0; i <= totalSeconds; i += step) {
      video.currentTime = i;
      await new Promise(r => { video.onseeked = r; });
      const detections = await onnxService.detectImage(video);
      framesProcessed++;
      setProgress(framesProcessed / framesToExtract);

      if (detections) {
        Object.keys(detections.count).forEach(key => {
          maxCounts[key] = Math.max((maxCounts[key] || 0), detections.count[key]);
        });
        if (detections.total > maxTotal) {
          maxTotal = detections.total;
          bestDetections = detections.detections;
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = video.videoWidth; tempCanvas.height = video.videoHeight;
          tempCanvas.getContext('2d').drawImage(video, 0, 0);
          bestImageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
        }
      }
    }

    setResult({ total: Object.values(maxCounts).reduce((a, b) => a + b, 0), count: maxCounts, detections: bestDetections });
    setBestFrameSrc(bestImageDataUrl);
    setIsProcessing(false);
  };

  const saveHistory = () => {
    if (!result || !bestFrameSrc) return;
    const summary = Object.entries(result.count).filter(([k,v]) => v > 0).map(([k,v]) => `${k}: ${v}`).join(', ');
    
    historyService.save({
      image: getCombinedCanvasDataUrl(displayImageRef.current, result.detections),
      total: result.total,
      summary: summary
    });
    toast.success('Disimpan ke Riwayat!');
  };

  return (
    <div>
      <div className={`scanner-area ${videoSrc ? 'has-content' : ''}`}>
        {!videoSrc ? (
          <>
            <label htmlFor="video-upload" style={{cursor: 'pointer', textAlign: 'center', display: 'block', width: '100%', padding: '4rem 0'}}>
              <Video size={48} color="var(--primary)" style={{marginBottom: '1rem'}} />
              <h3 style={{marginBottom: '0.5rem', color: 'var(--text-main)'}}>Unggah Video</h3>
              <p style={{color: 'var(--text-muted)'}}>Sistem akan mencari frame terbaik secara otomatis</p>
            </label>
            <input type="file" id="video-upload" accept="video/mp4,video/quicktime,video/x-m4v" onChange={handleVideoUpload} />
          </>
        ) : (
          <div style={{position: 'relative', width: '100%', display: 'flex', justifyContent: 'center'}}>
            <video ref={hiddenVideoRef} src={videoSrc} style={bestFrameSrc ? {display: 'none'} : {maxWidth: '100%', maxHeight: '600px', borderRadius: '12px'}} controls={!isProcessing && !bestFrameSrc} />
            {bestFrameSrc && (
              <div style={{position: 'relative', width: '100%', display: 'flex', justifyContent: 'center'}}>
                <img ref={displayImageRef} src={bestFrameSrc} alt="Best Frame" className="preview-image" onLoad={() => drawBoundingBoxes(displayImageRef.current, displayCanvasRef.current, result.detections)} />
                <canvas ref={displayCanvasRef} className="detection-canvas" />
              </div>
            )}
            {isProcessing && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Mengekstrak dan memindai video...</p>
                <div style={{width: '60%', height: '8px', background: '#e2e8f0', borderRadius: '4px', marginTop: '1rem'}}>
                  <div style={{width: `${progress * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s'}}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {videoSrc && (
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem'}}>
          {!bestFrameSrc && <button className="btn-primary" onClick={scanVideo} disabled={isProcessing}><Video size={18} /> {isProcessing ? 'Memproses...' : 'Mulai Deteksi'}</button>}
          <button className="btn-outline" onClick={() => {setVideoSrc(null); setResult(null); setBestFrameSrc(null);}}>Ganti Video</button>
          {bestFrameSrc && <button className="btn-primary" style={{background: '#10b981'}} onClick={saveHistory}><Save size={18} /> Simpan Riwayat</button>}
        </div>
      )}
      {result && <ResultPanel result={result} title="Frame Terbaik Video" />}
    </div>
  );
}

// -------------------------------------------------------------
// LIVE SCANNER
// -------------------------------------------------------------
function LiveScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState({ total: 0, count: {} });
  const requestRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsActive(true); }
    } catch (err) { alert("Gagal mengakses kamera."); }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    setIsActive(false);
    cancelAnimationFrame(requestRef.current);
    if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const processFrame = async () => {
    if (!isActive || !videoRef.current) return;
    if (videoRef.current.readyState >= 2 && !onnxService.isInferencing) {
      const detections = await onnxService.detectImage(videoRef.current);
      if (detections && isActive) {
        setResult(detections);
        drawBoundingBoxes(videoRef.current, canvasRef.current, detections.detections);
      }
    }
    requestRef.current = requestAnimationFrame(processFrame);
  };

  useEffect(() => { if (isActive) requestRef.current = requestAnimationFrame(processFrame); return () => cancelAnimationFrame(requestRef.current); }, [isActive]);
  useEffect(() => { return () => stopCamera(); }, []);

  return (
    <div>
      <div className="scanner-area has-content" style={{background: '#0f172a'}}>
        <div style={{position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center'}}>
          {!isActive && (
            <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10}}>
              <Camera size={48} style={{marginBottom: '1rem', opacity: 0.5}} />
              <p>Kamera Mati</p>
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline muted className="preview-video" style={{opacity: isActive ? 1 : 0}} />
          <canvas ref={canvasRef} className="detection-canvas" />
        </div>
      </div>

      <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem'}}>
        {!isActive ? (
          <button className="btn-primary" onClick={startCamera}><Play size={18} /> Mulai Kamera</button>
        ) : (
          <button className="btn-primary" style={{background: '#ef4444'}} onClick={stopCamera}>Hentikan Kamera</button>
        )}
      </div>
      {(result.total > 0) && <ResultPanel result={result} title="Live Real-time" />}
    </div>
  );
}

function ResultPanel({ result, title = "Hasil Deteksi" }) {
  if (!result || result.total === 0) return null;
  return (
    <div className="results-panel">
      <h3 style={{fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)'}}>{title}</h3>
      <p style={{fontWeight: 600}}>Total: <span style={{color: 'var(--primary)'}}>{result.total} Kendaraan</span></p>
      <div className="results-grid">
        {Object.entries(result.count).map(([label, count]) => count > 0 && (
          <div key={label} className="stat-card">
            <div className="stat-value">{count}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
