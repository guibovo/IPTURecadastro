interface OCRResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  detectedNumbers: string[];
  processedImage?: string;
}

interface OCRConfig {
  language: string;
  psm: number; // Page Segmentation Mode
  oem: number; // OCR Engine Mode
  whitelist?: string;
  blacklist?: string;
  threshold?: number;
  enhancement?: boolean;
}

class OCRProcessor {
  private worker: any = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Import Tesseract.js dynamically
      const Tesseract = await import('tesseract.js');
      
      this.worker = await Tesseract.createWorker('por', 1, {
        logger: (m: any) => console.log('OCR:', m)
      });

      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -/',
        tessedit_pageseg_mode: '8', // Single uniform block of text
        tessedit_ocr_engine_mode: '2' // LSTM only
      });

      this.isInitialized = true;
      console.log('OCR processor initialized');
    } catch (error) {
      console.error('Erro ao inicializar OCR:', error);
      throw new Error('Falha ao inicializar o processador OCR');
    }
  }

  async processImage(
    imageSource: string | File | Blob,
    config: Partial<OCRConfig> = {}
  ): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.init();
    }

    const defaultConfig: OCRConfig = {
      language: 'por',
      psm: 8,
      oem: 2,
      whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -/',
      threshold: 0.6,
      enhancement: true
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      // Pre-process image if enhancement is enabled
      let processedImage = imageSource;
      if (finalConfig.enhancement) {
        processedImage = await this.enhanceImage(imageSource);
      }

      // Run OCR
      const result = await this.worker.recognize(processedImage, {
        rectangle: config.boundingBox
      });

      // Extract numbers from the text
      const detectedNumbers = this.extractNumbers(result.data.text);

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence / 100,
        detectedNumbers,
        processedImage: typeof processedImage === 'string' ? processedImage : undefined
      };
    } catch (error) {
      console.error('Erro no processamento OCR:', error);
      throw new Error('Falha no reconhecimento de texto');
    }
  }

  private async enhanceImage(imageSource: string | File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply image enhancements
        this.applyContrast(data, 1.5);
        this.applyBrightness(data, 20);
        this.applyGrayscale(data);
        this.applyThreshold(data, 128);

        // Put processed data back
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject(new Error('Falha ao carregar imagem'));

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(imageSource);
      }
    });
  }

  private applyContrast(data: Uint8ClampedArray, contrast: number): void {
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));     // R
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)); // G
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)); // B
    }
  }

  private applyBrightness(data: Uint8ClampedArray, brightness: number): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + brightness));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // B
    }
  }

  private applyGrayscale(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
    }
  }

  private applyThreshold(data: Uint8ClampedArray, threshold: number): void {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const value = avg > threshold ? 255 : 0;
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
    }
  }

  private extractNumbers(text: string): string[] {
    const numbers: string[] = [];
    
    // Pattern for house numbers (can include letters and separators)
    const patterns = [
      /\b\d+[A-Za-z]?\b/g,           // 123, 123A, 123B
      /\b\d+[-\/]\d+[A-Za-z]?\b/g,   // 123-45, 123/45, 123-45A
      /\b\d+\s*[A-Za-z]\b/g,         // 123 A, 123A
      /\b[A-Za-z]\s*\d+\b/g,         // A 123, A123
      /\b\d+\s*[-\/]\s*\d+\b/g       // 123 - 45, 123 / 45
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        numbers.push(...matches.map(match => match.trim()));
      }
    });

    // Remove duplicates and filter valid numbers
    return [...new Set(numbers)]
      .filter(num => num.length > 0 && num.length < 20)
      .sort((a, b) => {
        // Prioritize pure numbers
        const aIsNumber = /^\d+$/.test(a);
        const bIsNumber = /^\d+$/.test(b);
        
        if (aIsNumber && !bIsNumber) return -1;
        if (!aIsNumber && bIsNumber) return 1;
        
        return a.localeCompare(b, undefined, { numeric: true });
      });
  }

  async processForHouseNumber(imageSource: string | File | Blob): Promise<string[]> {
    try {
      const result = await this.processImage(imageSource, {
        enhancement: true,
        psm: 8, // Single uniform block
        whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -/'
      });

      // Filter and validate house numbers
      const validNumbers = result.detectedNumbers.filter(num => {
        // Must contain at least one digit
        return /\d/.test(num) && num.length >= 1 && num.length <= 10;
      });

      return validNumbers;
    } catch (error) {
      console.error('Erro no processamento de número de casa:', error);
      return [];
    }
  }

  async processRegion(
    imageSource: string | File | Blob,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<OCRResult> {
    return this.processImage(imageSource, {
      boundingBox: region,
      enhancement: true
    });
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  // Utility method to validate Brazilian house number patterns
  validateBrazilianHouseNumber(number: string): boolean {
    // Common Brazilian house number patterns
    const validPatterns = [
      /^\d+$/,                    // 123
      /^\d+[A-Za-z]$/,           // 123A
      /^\d+[-\/]\d+$/,           // 123-45, 123/45
      /^\d+[-\/]\d+[A-Za-z]$/,   // 123-45A
      /^[A-Za-z]\d+$/,           // A123
      /^\d+\s[A-Za-z]$/,         // 123 A
      /^[A-Za-z]\s\d+$/          // A 123
    ];

    return validPatterns.some(pattern => pattern.test(number.trim()));
  }

  // Get confidence score for a detected number
  getNumberConfidence(text: string, detectedNumber: string): number {
    const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanNumber = detectedNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (cleanText.includes(cleanNumber)) {
      return 0.9;
    }
    
    // Calculate similarity
    let matches = 0;
    const minLength = Math.min(cleanText.length, cleanNumber.length);
    
    for (let i = 0; i < minLength; i++) {
      if (cleanText[i] === cleanNumber[i]) {
        matches++;
      }
    }
    
    return matches / Math.max(cleanText.length, cleanNumber.length);
  }
}

export const ocrProcessor = new OCRProcessor();
export type { OCRResult, OCRConfig };