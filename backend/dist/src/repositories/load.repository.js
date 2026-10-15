import db from '../config/database';
const normalizeTime = (value) => {
    if (!value)
        return undefined;
    const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match)
        return undefined;
    let hour = Number(match[1]);
    if (match[3]?.toUpperCase() === 'PM' && hour < 12)
        hour += 12;
    if (match[3]?.toUpperCase() === 'AM' && hour === 12)
        hour = 0;
    return `${String(hour).padStart(2, '0')}:${match[2]}`;
};
const normalizeTimeWindow = (value) => {
    if (!value)
        return { start: undefined, end: undefined };
    const [start, end] = value.split(/\s*[-–]\s*/);
    return { start: normalizeTime(start), end: normalizeTime(end) };
};
export class LoadRepository {
    async findAll(companyId, filters = {}, pagination = { limit: 10, offset: 0 }) {
        let query = db('loads')
            .select('loads.*', 'brokers.name as broker_name', 'companies.name as company_name')
            .leftJoin('brokers', function () {
            this.on('loads.broker_id', 'brokers.id').andOn('loads.company_id', 'brokers.company_id');
        })
            .leftJoin('companies', 'loads.company_id', 'companies.id')
            .where('loads.company_id', companyId);
        if (filters.status)
            query = query.whereRaw('LOWER(loads.status) = ?', [String(filters.status).toLowerCase()]);
        // Additional filters can be added here
        return query.limit(pagination.limit).offset(pagination.offset);
    }
    async findById(companyId, id) {
        const load = await db('loads')
            .select('loads.*', 'brokers.name as broker_name', 'companies.name as company_name')
            .leftJoin('brokers', function () {
            this.on('loads.broker_id', 'brokers.id').andOn('loads.company_id', 'brokers.company_id');
        })
            .leftJoin('companies', 'loads.company_id', 'companies.id')
            .where({ 'loads.id': id, 'loads.company_id': companyId })
            .first();
        if (!load)
            return null;
        const stops = await db('load_stops')
            .select('*', db.raw("to_char(appointment_date, 'YYYY-MM-DD') as appointment_date"))
            .where('load_id', id)
            .orderBy('stop_sequence', 'asc');
        return { ...load, stops };
    }
    async create(companyId, loadData, stopsData) {
        return db.transaction(async (trx) => {
            const [load] = await trx('loads').insert({ ...loadData, company_id: companyId }).returning('*');
            if (stopsData && stopsData.length > 0) {
                const stopsToInsert = stopsData.map((stop, index) => {
                    const startWindow = normalizeTimeWindow(stop.appointment_start || stop.time_start || stop.time);
                    const endWindow = normalizeTimeWindow(stop.appointment_end || stop.time_end);
                    return {
                        load_id: load.id,
                        stop_sequence: index + 1,
                        stop_type: stop.stop_type || stop.type,
                        facility_name: stop.facility_name,
                        address_line1: stop.address_line1 || stop.address,
                        address_line2: stop.address_line2,
                        city: stop.city,
                        state: stop.state,
                        zip_code: stop.zip_code || stop.zip,
                        appointment_date: stop.appointment_date || stop.date,
                        appointment_start: startWindow.start,
                        appointment_end: endWindow.end || endWindow.start || startWindow.end,
                        contact_name: stop.contact_name,
                        contact_phone: stop.contact_phone,
                        instructions: stop.instructions || stop.notes
                    };
                });
                await trx('load_stops').insert(stopsToInsert);
            }
            return load;
        });
    }
    async update(companyId, id, data) {
        const [load] = await db('loads')
            .where({ id, company_id: companyId })
            .update({ ...data, updated_at: db.fn.now() })
            .returning('*');
        return load;
    }
    async updateStatus(loadId, status, actorId, notes) {
        await db('loads')
            .where({ id: loadId })
            .update({
            status,
            updated_at: db.fn.now()
        });
        if (notes) {
            await db('load_status_history').insert({
                load_id: loadId,
                status,
                notes,
                changed_by: actorId,
                created_at: db.fn.now()
            });
        }
    }
    async delete(companyId, id) {
        return db('loads')
            .where({ id, company_id: companyId })
            .delete();
    }
}
export const loadRepository = new LoadRepository();
