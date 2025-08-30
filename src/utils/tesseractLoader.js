/**
 * Dynamic loader for Tesseract.js to reduce initial bundle size
 * Only loads when OCR functionality is actually needed
 */

let tesseractWorker = null;

export const getTesseractWorker = async () => {
  if (tesseractWorker) {
    return tesseractWorker;
  }

  try {
    // Dynamic import to lazy load tesseract.js
    const { createWorker } = await import('tesseract.js');
    tesseractWorker = await createWorker('eng');
    return tesseractWorker;
  } catch (error) {
    console.error('Failed to load Tesseract.js:', error);
    throw new Error('OCR functionality is not available');
  }
};

export const terminateTesseractWorker = async () => {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
};

export const performOCR = async (imageFile) => {
  const worker = await getTesseractWorker();
  
  try {
    const { data: { text } } = await worker.recognize(imageFile);
    return text;
  } catch (error) {
    console.error('OCR recognition failed:', error);
    throw error;
  }
};