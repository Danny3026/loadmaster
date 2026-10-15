import db from '../config/database';
export class DashboardRepository {
    async getStats(companyId) {
        const [[{ totalLoads }], [{ activeLoads }], [{ activeDrivers }], [{ availableTrucks }]] = await Promise.all([
            db('loads').where({ company_id: companyId }).count('id as totalLoads'),
            db('loads').where({ company_id: companyId }).whereRaw('LOWER(status) IN (?, ?, ?)', ['pending', 'dispatched', 'in_transit']).count('id as activeLoads'),
            db('drivers').where({ company_id: companyId, status: 'ACTIVE' }).count('id as activeDrivers'),
            db('trucks').where({ company_id: companyId, status: 'ACTIVE' }).count('id as availableTrucks')
        ]);
        return {
            totalLoads: parseInt(totalLoads),
            activeLoads: parseInt(activeLoads),
            activeDrivers: parseInt(activeDrivers),
            availableTrucks: parseInt(availableTrucks),
        };
    }
    async getStatusDistribution(companyId) {
        return db('loads')
            .where({ company_id: companyId })
            .select(db.raw('LOWER(status) as status'))
            .count('id as count')
            .groupByRaw('LOWER(status)');
    }
    async getRevenueTrend(companyId) {
        return db('loads')
            .whereRaw('company_id = ? AND LOWER(status) = ?', [companyId, 'delivered'])
            .select(db.raw("to_char(created_at, 'YYYY-MM') as month"))
            .sum('rate as revenue')
            .groupBy('month')
            .orderBy('month', 'desc')
            .limit(12);
    }
    async getRecentActivity(companyId) {
        return db('activity_logs')
            .select('activity_logs.*', 'users.first_name', 'users.last_name')
            .leftJoin('users', 'activity_logs.user_id', 'users.id')
            .where('activity_logs.company_id', companyId)
            .orderBy('activity_logs.created_at', 'desc')
            .limit(20);
    }
}
export const dashboardRepository = new DashboardRepository();
