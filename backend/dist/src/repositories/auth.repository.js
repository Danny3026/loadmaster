import db from '../config/database';
export class AuthRepository {
    async findUsersByEmail(email) {
        return db('users')
            .select('users.*', 'roles.name as role')
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .whereRaw('LOWER(users.email) = LOWER(?)', [email])
            .orderBy('users.created_at', 'asc');
    }
    async findUserByEmail(email) {
        return db('users')
            .select('users.*', 'roles.name as role')
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .where('email', email)
            .first();
    }
    async findUserById(id) {
        return db('users')
            .select('users.*', 'roles.name as role')
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .where('users.id', id)
            .first();
    }
    async findUserByResetToken(token) {
        return db('users').where('reset_password_token', token).first();
    }
    async updateUser(id, data) {
        return db('users').where('id', id).update(data);
    }
}
export const authRepository = new AuthRepository();
