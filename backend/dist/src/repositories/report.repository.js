import db from '../config/database';
export class ReportRepository {
    async loadReport(companyId, filters = {}) {
        const query = db('loads')
            .select('loads.load_number', 'loads.status', 'loads.rate', 'loads.commodity', 'brokers.name as broker_name')
            .leftJoin('brokers', 'loads.broker_id', 'brokers.id')
            .where('loads.company_id', companyId);
        if (filters.dateFrom)
            query.where('loads.created_at', '>=', filters.dateFrom);
        if (filters.dateTo)
            query.where('loads.created_at', '<=', filters.dateTo);
        return query.orderBy('loads.created_at', 'desc');
    }
    async driverReport(companyId, dateRange = {}) {
        // A complex query to aggregate driver performance based on assigned completed loads
        return db('drivers')
            .select('drivers.first_name', 'drivers.last_name')
            .count('loads.id as completed_loads')
            .sum('loads.rate as total_revenue')
            .leftJoin('load_assignments', 'drivers.id', 'load_assignments.driver_id')
            .leftJoin('loads', function () {
            this.on('load_assignments.load_id', '=', 'loads.id')
                .andOn('loads.status', '=', db.raw("'delivered'"));
        })
            .where('drivers.company_id', companyId)
            .groupBy('drivers.id');
    }
    async missingDocsReport(companyId) {
        // Delivered loads that do not have a POD or BOL
        return db('loads')
            .select('loads.id', 'loads.load_number', 'loads.status')
            .where('loads.company_id', companyId)
            .where('loads.status', 'delivered')
            .whereNotExists(function () {
            this.select('*')
                .from('documents')
                .whereRaw('documents.load_id = loads.id')
                .whereIn('documents.document_type', ['POD', 'BOL']);
        });
    }
}
export const reportRepository = new ReportRepository();
