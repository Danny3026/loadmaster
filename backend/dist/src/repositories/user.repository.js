import db from '../config/database';
import { ConflictError } from '../utils/errors';
export class UserRepository {
    async findAll(companyId, filters = {}) {
        let query = db('users')
            .select('users.id', 'users.email', 'users.first_name', 'users.last_name', 'users.phone', 'users.pay_percentage', 'users.status', 'users.created_at', 'users.updated_at', 'roles.name as role', 'roles.id as role_id')
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .where('users.company_id', companyId);
        if (filters.status) {
            query = query.where('users.status', filters.status);
        }
        const users = await query;
        return users.map(user => this.formatUser(user));
    }
    async findById(companyId, id) {
        const user = await db('users')
            .select('users.id', 'users.email', 'users.first_name', 'users.last_name', 'users.phone', 'users.pay_percentage', 'users.status', 'users.created_at', 'users.updated_at', 'roles.name as role')
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .where({ 'users.id': id, 'users.company_id': companyId })
            .first();
        return user ? this.formatUser(user) : null;
    }
    formatUser(user) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            payPercentage: user.pay_percentage ? parseFloat(user.pay_percentage) : null,
            role: user.role,
            status: user.status,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        };
    }
    async create(data) {
        return db.transaction(async (trx) => {
            const email = String(data.email).trim().toLowerCase();
            await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [email]);
            const existing = await trx('users').whereRaw('LOWER(email) = ?', [email]).first('id');
            if (existing)
                throw new ConflictError('An account with this email already exists');
            const [user] = await trx('users').insert({ ...data, email }).returning('*');
            const formattedUser = await trx('users')
                .select('users.id', 'users.email', 'users.first_name', 'users.last_name', 'users.phone', 'users.pay_percentage', 'users.status', 'users.created_at', 'users.updated_at', 'roles.name as role')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .where('users.id', user.id)
                .first();
            return formattedUser ? this.formatUser(formattedUser) : user;
        });
    }
    async update(companyId, id, data) {
        const [user] = await db('users')
            .where({ id, company_id: companyId })
            .update(data)
            .returning('*');
        return user;
    }
    async delete(companyId, id) {
        return db('users')
            .where({ id, company_id: companyId })
            .delete();
    }
}
export const userRepository = new UserRepository();
