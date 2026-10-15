import db from '../config/database';
export function applyDeliveredDateRange(query, filters, column = 'COALESCE(loads.updated_at, loads.created_at)') {
    if (filters.startDate) {
        query.whereRaw(`${column} >= ?`, [filters.startDate]);
    }
    if (filters.endDate) {
        query.whereRaw(`${column} <= ?`, [filters.endDate + ' 23:59:59']);
    }
    return query;
}
export class DashboardService {
    applyDeliveredDateRange(query, filters, column = 'COALESCE(loads.updated_at, loads.created_at)') {
        return applyDeliveredDateRange(query, filters, column);
    }
    async getMetrics(companyId, filters = {}) {
        // Base query for loads
        let loadsQuery = db('loads').where('loads.company_id', companyId);
        if (filters.driverId) {
            loadsQuery = loadsQuery
                .whereExists(function () {
                this.select('*')
                    .from('load_assignments as driver_assignment')
                    .whereRaw('driver_assignment.load_id = loads.id')
                    .andWhere('driver_assignment.driver_id', filters.driverId);
            });
        }
        if (filters.startDate) {
            loadsQuery = loadsQuery.whereRaw('COALESCE(loads.updated_at, loads.created_at) >= ?', [filters.startDate]);
        }
        if (filters.endDate) {
            loadsQuery = loadsQuery.whereRaw('COALESCE(loads.updated_at, loads.created_at) <= ?', [filters.endDate + ' 23:59:59']);
        }
        // Clone the base query for different aggregations
        // 1. Status Counts & Active Loads
        const statusCounts = await loadsQuery.clone()
            .select(db.raw('LOWER(loads.status) as status'))
            .count('* as count')
            .groupByRaw('LOWER(loads.status)');
        const statusMap = statusCounts.reduce((acc, curr) => {
            acc[String(curr.status || '').trim().toLowerCase()] = parseInt(curr.count, 10);
            return acc;
        }, {});
        const activeLoads = ['pending', 'dispatched', 'in_transit']
            .reduce((sum, status) => sum + (statusMap[status] || 0), 0);
        const pending = statusMap.pending || 0;
        const dispatched = statusMap.dispatched || 0;
        const inTransit = statusMap.in_transit || 0;
        const delivered = statusMap.delivered || 0;
        // 2. Active Drivers Count
        let driversCountQuery = db('drivers')
            .where({ company_id: companyId })
            .whereIn('status', ['ACTIVE', 'ASSIGNED']);
        if (filters.driverId) {
            driversCountQuery = driversCountQuery.where('id', filters.driverId);
        }
        const activeDriversResult = await driversCountQuery.count('id as count').first();
        const activeDrivers = parseInt(activeDriversResult?.count, 10) || 0;
        // 2b. Total registered drivers (ignore status)
        let totalDriversQuery = db('drivers').where({ company_id: companyId });
        if (filters.driverId) {
            totalDriversQuery = totalDriversQuery.where('id', filters.driverId);
        }
        const totalDriversResult = await totalDriversQuery.count('id as count').first();
        const totalDrivers = parseInt(totalDriversResult?.count, 10) || 0;
        // 3. Financials & Miles (Revenue, Avg Rate/Mile, Loaded/Deadhead/Total Miles)
        const milesResult = await loadsQuery.clone()
            .whereRaw('LOWER(loads.status) = ?', ['delivered'])
            .sum('loads.loaded_miles as total_loaded_miles')
            .sum('loads.deadhead_miles as total_deadhead_miles')
            .first();
        const revenueQuery = db('invoices')
            .join('loads', function () {
            this.on('loads.id', 'invoices.load_id').andOn('loads.company_id', 'invoices.company_id');
        })
            .where('invoices.company_id', companyId)
            .where('invoices.payment_status', 'PAID')
            .whereNotIn('invoices.status', ['CANCELLED', 'VOIDED'])
            .whereRaw('LOWER(loads.status) = ?', ['delivered']);
        if (filters.driverId) {
            revenueQuery.whereExists(function () {
                this.select('*').from('load_assignments as driver_assignment')
                    .whereRaw('driver_assignment.load_id = loads.id')
                    .andWhere('driver_assignment.driver_id', filters.driverId);
            });
        }
        this.applyDeliveredDateRange(revenueQuery, filters);
        const revenueResult = await revenueQuery.clone().sum('invoices.total_amount as total_revenue').first();
        const revenue = parseFloat(revenueResult?.total_revenue) || 0;
        const driverPayQuery = db('settlements')
            .where('settlements.company_id', companyId)
            .where('settlements.status', 'PAID');
        if (filters.driverId) {
            driverPayQuery.where('settlements.driver_id', filters.driverId);
        }
        if (filters.startDate) {
            driverPayQuery.whereRaw('settlements.period_end >= ?', [filters.startDate]);
        }
        if (filters.endDate) {
            driverPayQuery.whereRaw('settlements.period_start <= ?', [filters.endDate]);
        }
        const driverPayResult = await driverPayQuery.sum('settlements.net_amount as total_driver_pay').first();
        const driverPay = parseFloat(driverPayResult?.total_driver_pay) || 0;
        const loadedMiles = parseFloat(milesResult?.total_loaded_miles) || 0;
        const deadheadMiles = parseFloat(milesResult?.total_deadhead_miles) || 0;
        const totalMiles = loadedMiles + deadheadMiles;
        const avgRateResult = loadsQuery.clone()
            .whereRaw('LOWER(loads.status) = ?', ['delivered'])
            .where('loads.loaded_miles', '>', 0);
        this.applyDeliveredDateRange(avgRateResult, filters);
        const avgRateSummary = await avgRateResult
            .avg({ avg_rate_per_mile: db.raw('loads.rate / NULLIF(loads.loaded_miles, 0)') })
            .first();
        const avgRatePerMile = parseFloat(avgRateSummary?.avg_rate_per_mile) || 0;
        // 4. Chart: Revenue By Equipment Type
        const revenueByEquipmentResult = await revenueQuery.clone()
            .whereRaw('LOWER(loads.status) = ?', ['delivered'])
            .select('loads.equipment_type as name')
            .sum('invoices.total_amount as revenue')
            .groupBy('loads.equipment_type');
        // 5. Chart: Avg Rate Per Mile by Equipment Type
        const rateByEquipmentResult = await revenueQuery.clone()
            .whereRaw('LOWER(loads.status) = ?', ['delivered'])
            .select('loads.equipment_type as name')
            .avg({ avg_rate_per_mile: db.raw('loads.rate / NULLIF(loads.loaded_miles, 0)') })
            .groupBy('loads.equipment_type');
        const rateByEquipment = rateByEquipmentResult.map((item) => {
            const rev = parseFloat(item.avg_rate_per_mile) || 0;
            return {
                name: item.name || 'Unknown',
                value: parseFloat(rev.toFixed(2))
            };
        });
        const revenueByEquipment = revenueByEquipmentResult.map((item) => ({
            name: item.name || 'Unknown',
            revenue: parseFloat(item.revenue) || 0
        }));
        // 6. Driver Performance
        const driverPerformanceQuery = db('load_assignments')
            .join('loads', 'loads.id', 'load_assignments.load_id')
            .join('drivers', function () {
            this.on('drivers.id', 'load_assignments.driver_id').andOn('drivers.company_id', 'loads.company_id');
        })
            .where('loads.company_id', companyId)
            .whereRaw('LOWER(loads.status) = ?', ['delivered'])
            .join('invoices', 'invoices.load_id', 'loads.id')
            .where('invoices.payment_status', 'PAID')
            .whereNotIn('invoices.status', ['CANCELLED', 'VOIDED']);
        if (filters.driverId) {
            driverPerformanceQuery.where('drivers.id', filters.driverId);
        }
        this.applyDeliveredDateRange(driverPerformanceQuery, filters);
        const driverPerformanceResult = await driverPerformanceQuery
            .select('drivers.id as driver_id', 'drivers.first_name', 'drivers.last_name', db.raw('COUNT(loads.id) as total_loads'), db.raw('SUM(invoices.total_amount) as total_revenue'), db.raw('SUM(loads.loaded_miles) as loaded_miles'), db.raw('SUM(loads.deadhead_miles) as deadhead_miles'))
            .groupBy('drivers.id', 'drivers.first_name', 'drivers.last_name');
        const driverPayRows = await db('settlements')
            .join('drivers', 'drivers.id', 'settlements.driver_id')
            .where('settlements.company_id', companyId)
            .where('settlements.status', 'PAID')
            .modify((query) => {
            if (filters.driverId)
                query.where('settlements.driver_id', filters.driverId);
            if (filters.startDate)
                query.whereRaw('settlements.period_end >= ?', [filters.startDate]);
            if (filters.endDate)
                query.whereRaw('settlements.period_start <= ?', [filters.endDate]);
        })
            .select('settlements.driver_id')
            .sum('settlements.net_amount as driver_pay')
            .groupBy('settlements.driver_id');
        const driverPayById = new Map(driverPayRows.map((row) => [row.driver_id, parseFloat(row.driver_pay) || 0]));
        const driverPerformance = driverPerformanceResult.map((d) => {
            const rev = parseFloat(d.total_revenue) || 0;
            const lm = parseFloat(d.loaded_miles) || 0;
            const dm = parseFloat(d.deadhead_miles) || 0;
            const tm = lm + dm;
            return {
                driverId: d.driver_id,
                name: `${d.first_name} ${d.last_name}`,
                loads: parseInt(d.total_loads, 10) || 0,
                revenue: rev,
                driverPay: driverPayById.get(d.driver_id) || 0,
                totalMiles: tm,
                avgRate: lm > 0 ? parseFloat((rev / lm).toFixed(2)) : 0
            };
        });
        return {
            activeLoads,
            activeDrivers,
            totalDrivers,
            revenue,
            driverPay,
            avgRatePerMile: parseFloat(avgRatePerMile.toFixed(2)),
            dispatched,
            pending,
            inTransit,
            delivered,
            deadheadMiles,
            loadedMiles,
            totalMiles,
            rateByEquipment,
            revenueByEquipment,
            driverPerformance
        };
    }
    // Keep old methods for backwards compatibility if needed
    async getSummary(companyId, filters = {}) {
        return {};
    }
    async getLoadStatusDistribution(companyId, filters = {}) {
        return [];
    }
    async getRevenueOverTime(companyId, groupBy, filters = {}) {
        return [];
    }
}
export const dashboardService = new DashboardService();
