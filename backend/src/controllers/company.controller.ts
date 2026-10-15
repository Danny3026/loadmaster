import { Request, Response, NextFunction } from 'express';
import { companyService } from '../services/company.service';
import { success } from '../utils/response';
import { storageConfig } from '../config/storage';
import { createHash } from 'crypto';
import { getLogoExtension } from '../utils/logo-image';

export const getCurrentCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.getForCompany(req.tenantContext?.companyId);
    res.json(success(company));
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.updateCompany(req.tenantContext!.companyId, req.body);
    res.json(success(company));
  } catch (error) {
    next(error);
  }
};

export const getPayerEin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tin = await companyService.getPayerEin(req.tenantContext!.companyId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.json(success({ tin }));
  } catch (error) {
    next(error);
  }
};

export const uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, error: { message: 'No logo file uploaded' } });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: { message: 'Logo must be 5MB or less.' } });
    }

    const extension = getLogoExtension(file.buffer);
    if (!extension) {
      return res.status(400).json({ success: false, error: { message: 'Invalid logo image. Use PNG, JPG, or WebP.' } });
    }

    await companyService.getForCompany(req.tenantContext!.companyId);
    const contentHash = createHash('sha256').update(file.buffer).digest('hex').slice(0, 16);
    const fileName = `company-${req.tenantContext!.companyId}-logo-${contentHash}.${extension}`;
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.resolve(storageConfig.local.path, req.tenantContext!.companyId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.resolve(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const imageUrl = `/storage/${req.tenantContext!.companyId}/${fileName}`;
    const updated = await companyService.updateCompany(req.tenantContext!.companyId, { logo_url: imageUrl });
    res.json(success(updated));
  } catch (error) {
    next(error);
  }
};
