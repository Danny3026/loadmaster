import { loadRepository } from '../repositories/load.repository';
import { documentRepository } from '../repositories/document.repository';
import db from '../config/database';

export class ReportService {
  async getLoadReport(companyId: string, filters: any = {}): Promise<any[]> {
    return loadRepository.findAll(companyId, filters);
  }

  async getRevenueReport(companyId: string, filters: any = {}): Promise<any[]> {
    let dateTrunc = filters.group_by || 'month';
    const query = db('loads')
      .where('company_id', companyId)
      .where('status', 'delivered')
      .select(db.raw(`date_trunc('${dateTrunc}', created_at) as period`))
      .sum('rate as revenue')
      .count('id as load_count')
      .groupByRaw(`date_trunc('${dateTrunc}', created_at)`)
      .orderBy('period', 'desc');

    if (filters.date_from) query.andWhere('created_at', '>=', filters.date_from);
    if (filters.date_to) query.andWhere('created_at', '<=', filters.date_to);

    return query;
  }

  async getDriverReport(companyId: string, filters: any = {}): Promise<any[]> {
    const query = db('drivers as d')
      .where('d.company_id', companyId)
      .leftJoin('users as u', function() {
        this.on('d.user_id', 'u.id').andOn('d.company_id', 'u.company_id');
      })
      .leftJoin('load_assignments as la', function() {
        this.on('la.driver_id', '=', 'd.id')
          .andOn(db.raw('la.status != ?', ['UNASSIGNED']));
      })
      .leftJoin('loads as l', function() {
        this.on('la.load_id', 'l.id').andOn('l.company_id', 'd.company_id');
      })
      .select('d.id', 'd.driver_code', 'u.first_name', 'u.last_name')
      .count('l.id as total_loads')
      .sum('l.rate as total_revenue')
      .groupBy('d.id', 'd.driver_code', 'u.first_name', 'u.last_name');

    if (filters.date_from) query.andWhere('l.created_at', '>=', filters.date_from);
    if (filters.date_to) query.andWhere('l.created_at', '<=', filters.date_to);

    return query;
  }

  async getMissingDocumentsReport(companyId: string, filters: any = {}): Promise<any[]> {
    return documentRepository.findMissingDocuments(companyId, filters);
  }

  formatAsCsv(data: any[], columns?: string[]): string {
    if (!data || data.length === 0) return '';
    const cols = columns || Object.keys(data[0]);
    const header = cols.join(',');
    const rows = data.map(row => {
      return cols.map(col => {
        let val = row[col] === null || row[col] === undefined ? '' : String(row[col]);
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    });
    return [header, ...rows].join('\n');
  }
}

export const reportService = new ReportService();
