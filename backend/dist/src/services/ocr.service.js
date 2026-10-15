import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
export class OcrService {
    async renderPdfPages(buffer, dpi = 300) {
        const loadMuPdf = new Function('specifier', 'return import(specifier)');
        const mupdf = await loadMuPdf('mupdf');
        const document = mupdf.Document.openDocument(buffer, 'application/pdf');
        const scale = dpi / 72;
        const pages = [];
        for (let pageNumber = 0; pageNumber < document.countPages(); pageNumber += 1) {
            const page = document.loadPage(pageNumber);
            const bounds = page.getBounds();
            const matrix = mupdf.Matrix.scale(scale, scale);
            const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
            void bounds;
            pages.push(Buffer.from(pixmap.asPNG()));
        }
        return pages;
    }
    async extractImageText(buffer) {
        const worker = await createWorker('eng');
        try {
            const result = await worker.recognize(buffer);
            return result.data.text.trim();
        }
        finally {
            await worker.terminate();
        }
    }
    async extractPdfText(buffer) {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        const worker = await createWorker('eng');
        const pages = [];
        try {
            for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
                const page = await document.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 300 / 72 });
                const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
                const context = canvas.getContext('2d');
                await page.render({
                    canvas: canvas,
                    canvasContext: context,
                    viewport,
                }).promise;
                const result = await worker.recognize(canvas.toBuffer('image/png'));
                pages.push(result.data.text);
            }
        }
        finally {
            await worker.terminate();
        }
        return pages.join('\n').trim();
    }
}
export const ocrService = new OcrService();
