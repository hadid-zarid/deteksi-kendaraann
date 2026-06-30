import * as ort from 'onnxruntime-web';

// Konfigurasi wasm agar bisa menemukan file wasm-nya
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

class OnnxService {
  constructor() {
    this.session = null;
    this.isInitialized = false;
    this.isInferencing = false;
    this.inputSize = 640;
    this.classes = ['Mobil', 'Motor', 'Bus', 'Truk'];
  }

  async init() {
    if (this.isInitialized) return;
    try {
      console.log('Loading ONNX Model...');
      // Memuat model dari folder public/best.onnx
      this.session = await ort.InferenceSession.create('/best.onnx', {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      this.isInitialized = true;
      console.log('ONNX Model loaded successfully');
    } catch (error) {
      console.error('Failed to load ONNX model:', error);
      throw error;
    }
  }

  async detectImage(imageElement) {
    if (!this.isInitialized || !this.session || this.isInferencing) return null;
    this.isInferencing = true;

    try {
      // 1. Preprocess: Resize and Pad image to 640x640 using Canvas
      const { tensor, padX, padY, scaledWidth, scaledHeight, srcWidth, srcHeight } = this.preprocess(imageElement);
      
      // 2. Run Inference
      const feeds = {};
      feeds[this.session.inputNames[0]] = tensor;
      const results = await this.session.run(feeds);
      
      // 3. Postprocess: Get bounding boxes and NMS
      const output = results[this.session.outputNames[0]];
      const detections = this.postprocess(output, padX, padY, scaledWidth, scaledHeight, srcWidth, srcHeight);
      
      return detections;
    } catch (e) {
      console.error('Inference error:', e);
      return null;
    } finally {
      this.isInferencing = false;
    }
  }

  preprocess(imageElement) {
    const targetSize = this.inputSize;
    const srcWidth = imageElement.videoWidth || imageElement.naturalWidth || imageElement.width;
    const srcHeight = imageElement.videoHeight || imageElement.naturalHeight || imageElement.height;

    const scale = Math.min(targetSize / srcWidth, targetSize / srcHeight);
    const scaledWidth = Math.round(srcWidth * scale);
    const scaledHeight = Math.round(srcHeight * scale);

    const padX = Math.floor((targetSize - scaledWidth) / 2);
    const padY = Math.floor((targetSize - scaledHeight) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Fill with padding color (114, 114, 114)
    ctx.fillStyle = 'rgb(114, 114, 114)';
    ctx.fillRect(0, 0, targetSize, targetSize);

    // Draw resized image in center
    ctx.drawImage(imageElement, padX, padY, scaledWidth, scaledHeight);

    const imageData = ctx.getImageData(0, 0, targetSize, targetSize).data;
    
    // Convert to Float32Array shape [1, 3, 640, 640] normalized to 0-1
    const float32Data = new Float32Array(3 * targetSize * targetSize);
    const rOffset = 0;
    const gOffset = targetSize * targetSize;
    const bOffset = 2 * targetSize * targetSize;

    for (let i = 0; i < targetSize * targetSize; i++) {
      float32Data[rOffset + i] = imageData[i * 4] / 255.0;
      float32Data[gOffset + i] = imageData[i * 4 + 1] / 255.0;
      float32Data[bOffset + i] = imageData[i * 4 + 2] / 255.0;
    }

    const tensor = new ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);
    
    return { tensor, padX, padY, scaledWidth, scaledHeight, srcWidth, srcHeight };
  }

  postprocess(outputTensor, padX, padY, scaledWidth, scaledHeight, srcWidth, srcHeight) {
    const data = outputTensor.data;
    const numFeatures = outputTensor.dims[1]; // misal 8 (4 bbox + 4 classes)
    const numAnchors = outputTensor.dims[2]; // misal 8400
    const confThreshold = 0.5;

    let detections = [];

    // outputTensor shape: [1, numFeatures, numAnchors]
    for (let i = 0; i < numAnchors; i++) {
      let maxClassConf = 0;
      let classId = -1;

      // Class probabilities start at index 4
      for (let c = 4; c < numFeatures; c++) {
        // Flat index = batch * (numFeatures * numAnchors) + feature * numAnchors + anchor
        const conf = data[c * numAnchors + i];
        if (conf > maxClassConf) {
          maxClassConf = conf;
          classId = c - 4;
        }
      }

      if (maxClassConf > confThreshold) {
        const cx = data[0 * numAnchors + i];
        const cy = data[1 * numAnchors + i];
        const w = data[2 * numAnchors + i];
        const h = data[3 * numAnchors + i];

        const absXMin = cx - w / 2;
        const absYMin = cy - h / 2;
        const absXMax = cx + w / 2;
        const absYMax = cy + h / 2;

        // Unpad and normalize relative to original image size
        const xMin = Math.max(0, (absXMin - padX) / scaledWidth);
        const yMin = Math.max(0, (absYMin - padY) / scaledHeight);
        const xMax = Math.min(1, (absXMax - padX) / scaledWidth);
        const yMax = Math.min(1, (absYMax - padY) / scaledHeight);

        const className = classId >= 0 && classId < this.classes.length ? this.classes[classId] : "Unknown";

        detections.push({
          label: className,
          confidence: maxClassConf,
          bbox: [xMin, yMin, xMax, yMax]
        });
      }
    }

    detections = this.applyNMS(detections, 0.4);

    const counts = {};
    for (const d of detections) {
      counts[d.label] = (counts[d.label] || 0) + 1;
    }

    return {
      total: detections.length,
      count: counts,
      detections: detections
    };
  }

  applyNMS(boxes, iouThreshold) {
    boxes.sort((a, b) => b.confidence - a.confidence);
    const selected = [];

    for (const box of boxes) {
      let shouldSelect = true;
      for (const selectedBox of selected) {
        if (box.label === selectedBox.label && this.calculateIoU(box, selectedBox) > iouThreshold) {
          shouldSelect = false;
          break;
        }
      }
      if (shouldSelect) {
        selected.push(box);
      }
    }
    return selected;
  }

  calculateIoU(a, b) {
    const xA = Math.max(a.bbox[0], b.bbox[0]);
    const yA = Math.max(a.bbox[1], b.bbox[1]);
    const xB = Math.min(a.bbox[2], b.bbox[2]);
    const yB = Math.min(a.bbox[3], b.bbox[3]);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]);
    const boxBArea = (b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]);

    return interArea / (boxAArea + boxBArea - interArea);
  }
}

export const onnxService = new OnnxService();
