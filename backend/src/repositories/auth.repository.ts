import db from '../config/database';

export class AuthRepository {
  async findUsersByEmail(email: string) {
    return db('users')
      .select('users.*', 'roles.name as role')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .whereRaw('LOWER(users.email) = LOWER(?)', [email])
      .orderBy('users.created_at', 'asc');
  }

  async findUserByEmail(email: string) {
    return db('users')
      .select('users.*', 'roles.name as role')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .where('email', email)
      .first();
  }

  async findUserById(id: string) {
    return db('users')
      .select('users.*', 'roles.name as role')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .where('users.id', id)
      .first();
  }

  async findUserByResetToken(token: string) {
    return db('users').where('reset_password_token', token).first();
  }

  async updateUser(id: string, data: any) {
    return db('users').where('id', id).update(data);
  }
}

export const authRepository = new AuthRepository();
