import { Request, Response, NextFunction } from 'express';
import { invoiceService } from '../services/invoice.service';
import { success, paginated } from '../utils/response';
import { taxPreparationService } from '../services/tax-preparation.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;

    const pagination = { limit, offset };
    const filters = {
      status: req.query.status,
      payment_status: req.query.payment_status,
      search: req.query.search,
    };

    const result = await invoiceService.getAll(req.tenantContext!.companyId, filters, pagination);
    const total = typeof result.total === 'string' ? parseInt(result.total, 10) : (result.total || 0);
    
    res.json(
      paginated({
        data: result.data || [],
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (err) {
    console.error('Error in getAll invoices:', err);
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.getById(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.create(req.tenantContext!.companyId, req.body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.update(req.tenantContext!.companyId, req.params.id, req.body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await invoiceService.delete(req.tenantContext!.companyId, req.params.id);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
};

export const markAsSent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.markAsSent(
      req.tenantContext!.companyId,
      req.params.id,
      req.body?.invoice_sent_date
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const markAsPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.markAsPaid(
      req.tenantContext!.companyId,
      req.params.id,
      req.body?.payment_received_date
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.getInvoiceStats(req.tenantContext!.companyId);
    res.json(success(result || {}));
  } catch (err) {
    next(err);
  }
};

export const getTaxSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.getTaxSummary(req.tenantContext!.companyId, {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      include: (req.query.include as string | undefined) || 'PAID',
    });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const validateTaxPreparation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceService.validateTaxPreparation(req.tenantContext!.companyId, req.params.driverId, {
      taxYear: req.query.taxYear,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getDevelopmentTaxFixture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taxYear = Number(req.query.taxYear);
    const result = invoiceService.getDevelopmentTaxFixture(taxYear);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const createTaxPreparation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await taxPreparationService.create(req.tenantContext!.companyId, {
      driverId: req.body.driverId,
      taxYear: Number(req.body.taxYear),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      testOnly: req.body.testOnly === true,
      testMailingAddress: req.body.testMailingAddress,
      expectedSnapshot: req.body.expectedSnapshot,
      pdfBase64: req.body.pdfBase64,
    });
    res.status(201).json(success(record));
  } catch (err) {
    next(err);
  }
};

export const getTaxPreparations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taxYear = req.query.taxYear === undefined ? undefined : Number(req.query.taxYear);
    const records = await taxPreparationService.list(req.tenantContext!.companyId, taxYear);
    res.setHeader('Cache-Control', 'no-store');
    res.json(success(records));
  } catch (err) {
    next(err);
  }
};

export const downloadTaxPreparation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await taxPreparationService.getPdf(req.tenantContext!.companyId, req.params.id);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.send(document.pdf);
  } catch (err) {
    next(err);
  }
};