import { createRequire } from 'module';
import { aiService } from './ai.service';
import { ocrService } from './ocr.service';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
export class ExtractionService {
    async extractCdl(buffer, mimeType) {
        if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
            throw new Error('Only PDF and image files are supported');
        }
        let text = '';
        if (mimeType === 'application/pdf') {
            text = await this.extractPdfTextLayer(buffer);
            if (!text) {
                try {
                    text = (await pdfParse(buffer)).text.trim();
                }
                catch {
                    text = '';
                }
            }
        }
        let imagePages;
        if (mimeType.startsWith('image/')) {
            imagePages = [buffer];
            text = await ocrService.extractImageText(buffer);
        }
        else if (text.length < 80) {
            imagePages = await ocrService.renderPdfPages(buffer, 300);
            text = await ocrService.extractPdfText(buffer);
        }
        return aiService.extractCdlDocument({ text: text || undefined, imagePages, imageMimeType: mimeType });
    }
    async extractRateConfirmation(buffer, mimeType) {
        if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
            return {
                document_type: 'unknown',
                broker_name: null,
                broker_mc: null,
                carrier_name: null,
                carrier_mc: null,
                load_id: null,
                carrier_pro: null,
                bol_number: null,
                pickup_stops: [],
                delivery_stops: [],
                equipment_type: null,
                commodity: null,
                weight: null,
                miles: null,
                total_rate: null,
                rate_type: null,
                detention_terms: null,
                fuel_surcharge: null,
                accessorials: [],
                payment_terms: null,
                special_instructions: null,
                _meta: { extraction_method: 'text_layer', field_confidence: {}, overall_confidence: 0 },
            };
        }
        let text = '';
        if (mimeType === 'application/pdf') {
            text = await this.extractPdfTextLayer(buffer);
            if (!text) {
                try {
                    text = (await pdfParse(buffer)).text.trim();
                }
                catch {
                    text = '';
                }
            }
        }
        if (text.length >= 80) {
            return aiService.extractRateConfirmationDocument({ text, extractionMethod: 'text_layer' });
        }
        const imagePages = mimeType === 'application/pdf'
            ? await ocrService.renderPdfPages(buffer, 300)
            : [buffer];
        const ocrText = mimeType === 'application/pdf'
            ? await ocrService.extractPdfText(buffer)
            : await ocrService.extractImageText(buffer);
        return aiService.extractRateConfirmationDocument({
            text: ocrText || undefined,
            imagePages,
            extractionMethod: 'image_multimodal',
        });
    }
    async extractPdfTextLayer(buffer) {
        try {
            const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
            const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
            const pages = [];
            for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
                const page = await document.getPage(pageNumber);
                const content = await page.getTextContent();
                const lines = new Map();
                for (const item of content.items) {
                    const y = Math.round(item.transform?.[5] || 0);
                    const line = lines.get(y) || [];
                    line.push(item.str || '');
                    lines.set(y, line);
                }
                pages.push([...lines.entries()]
                    .sort(([left], [right]) => right - left)
                    .map(([, line]) => line.join(' ').trim())
                    .filter(Boolean)
                    .join('\n'));
            }
            return pages.join('\n').trim();
        }
        catch {
            return '';
        }
    }
    async extract(buffer, mimeType) {
        const extraction = await this.extractStructured(buffer, mimeType);
        return Object.entries(extraction.fields)
            .filter(([, field]) => field.value !== null && field.value !== undefined && field.value !== '')
            .map(([field_name, field]) => ({
            field_name,
            extracted_value: typeof field.value === 'string' ? field.value : JSON.stringify(field.value),
            confidence: Math.max(0, Math.min(1, Number(field.confidence) || 0)),
        }));
    }
    async extractStructured(buffer, mimeType) {
        const document = await this.extractRateConfirmation(buffer, mimeType);
        const fieldValues = [
            ['broker_name', document.broker_name], ['broker_mc', document.broker_mc], ['carrier_name', document.carrier_name], ['carrier_mc', document.carrier_mc],
            ['load_id', document.load_id], ['carrier_pro', document.carrier_pro], ['bol_number', document.bol_number],
            ['pickup_stops', document.pickup_stops], ['delivery_stops', document.delivery_stops], ['equipment_type', document.equipment_type],
            ['commodity', document.commodity], ['weight', document.weight], ['miles', document.miles], ['total_rate', document.total_rate],
            ['rate_type', document.rate_type], ['detention_terms', document.detention_terms], ['fuel_surcharge', document.fuel_surcharge],
            ['accessorials', document.accessorials], ['payment_terms', document.payment_terms], ['special_instructions', document.special_instructions],
        ];
        const fields = Object.fromEntries(fieldValues.map(([field, value]) => [
            field,
            { value, confidence: document._meta.field_confidence[field] || document._meta.overall_confidence },
        ]));
        return { document_type: document.document_type.toUpperCase(), fields };
    }
}
export const extractionService = new ExtractionService();
