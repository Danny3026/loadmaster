import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { extractionService } from '../services/extraction.service';
import documentExtractionUpload from '../middleware/documentExtractionUpload';

export const extractLoadDetails = async (req: Request, res: Response): Promise<void> => {
  documentExtractionUpload(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      res.status(400).json({ success: false, error: { message: err.message || 'File upload failed' } });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
      return;
    }

    try {
      const structured = await extractionService.extractRateConfirmation(Buffer.from(req.file.buffer), req.file.mimetype);
      const extractedData = {
        ...aiService.toLegacyRateConfirmation(structured),
        structured,
      };

      res.status(200).json({
        success: true,
        data: extractedData
      });
    } catch (error: any) {
      logger.error('Failed to process PDF:', error);
      res.status(500).json({ 
        success: false, 
        error: { message: error.message || 'Failed to process document' } 
      });
    }
  });
};
