import db from '../config/database';
export class ActivityLogRepository {
    async create(data) {
        await db('activity_logs').insert(data);
    }
    async findAll(companyId, filters = {}) {
        const query = db('activity_logs as a')
            .leftJoin('users as u', 'a.user_id', 'u.id')
            .where('a.company_id', companyId)
            .select('a.*', 'u.first_name', 'u.last_name');
        if (filters.user_id)
            query.andWhere('a.user_id', filters.user_id);
        if (filters.entity_type)
            query.andWhere('a.entity_type', filters.entity_type);
        if (filters.date_from)
            query.andWhere('a.created_at', '>=', filters.date_from);
        if (filters.date_to)
            query.andWhere('a.created_at', '<=', filters.date_to);
        if (filters.limit && filters.offset !== undefined) {
            query.limit(filters.limit).offset(filters.offset);
        }
        const logs = await query.orderBy('a.created_at', 'desc');
        logs.forEach(log => {
            log.user_name = log.first_name ? `${log.first_name} ${log.last_name}` : 'System';
        });
        return logs;
    }
    async countAll(companyId, filters = {}) {
        const query = db('activity_logs as a').where('a.company_id', companyId);
        if (filters.user_id)
            query.andWhere('a.user_id', filters.user_id);
        if (filters.entity_type)
            query.andWhere('a.entity_type', filters.entity_type);
        if (filters.date_from)
            query.andWhere('a.created_at', '>=', filters.date_from);
        if (filters.date_to)
            query.andWhere('a.created_at', '<=', filters.date_to);
        const res = await query.count('a.id as count').first();
        return parseInt(res?.count, 10) || 0;
    }
}
export const activityLogRepository = new ActivityLogRepository();
