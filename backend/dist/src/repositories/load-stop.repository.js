import db from '../config/database';
export class LoadStopRepository {
    async findByLoadId(loadId) {
        return db('load_stops').where({ load_id: loadId }).orderBy('stop_sequence', 'asc');
    }
    async createMany(loadId, stops) {
        const stopsToInsert = stops.map((s, i) => ({
            ...s,
            load_id: loadId,
            stop_sequence: s.stop_sequence || i + 1
        }));
        return db('load_stops').insert(stopsToInsert).returning('*');
    }
    async deleteByLoadId(loadId) {
        return db('load_stops').where({ load_id: loadId }).delete();
    }
}
export const loadStopRepository = new LoadStopRepository();
