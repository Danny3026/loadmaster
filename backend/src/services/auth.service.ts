import jwt from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { env } from '../config/env';
import { authRepository } from '../repositories/auth.repository';
import db from '../config/database';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { JwtPayload, Role } from '../types';
import { emailService } from './email.service';

export class AuthService {
  async getUserById(id: string) {
    return authRepository.findUserById(id);
  }

  async login(email: string, password: string) {
    const matchingUsers = await authRepository.findUsersByEmail(email);
    if (matchingUsers.length > 1) {
      throw new UnauthorizedError('Unable to authenticate with those credentials');
    }
    const user = matchingUsers[0];

    if (!user) {
      throw new UnauthorizedError('No account found with that email address');
    }
    
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Your account is inactive');
    }

    const isValidPassword = await argon2.verify(user.password_hash, password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Incorrect password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
      mustChangePassword: Boolean(user.must_change_password),
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });

    const { password_hash, reset_password_token, reset_password_expires, ...safeUser } = user;
    return { user: safeUser, token, refreshToken };
  }

  async register(input: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string | null;
  }) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(input.password);
    const user = await db.transaction(async (trx: any) => {
      await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [email]);
      const existingUser = await trx('users')
        .whereRaw('LOWER(email) = ?', [email])
        .first('id');
      if (existingUser) throw new ConflictError('An account with this email already exists');

      const adminRole = await trx('roles').where({ name: 'ADMIN' }).first('id');
      if (!adminRole) throw new NotFoundError('ADMIN role is not configured');

      const [company] = await trx('companies').insert({
        name: input.companyName.trim(),
        email,
        phone: input.phone?.trim() || null,
        status: 'ACTIVE',
      }).returning(['id']);

      const [createdUser] = await trx('users').insert({
        company_id: company.id,
        role_id: adminRole.id,
        email,
        password_hash: passwordHash,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        status: 'ACTIVE',
        must_change_password: false,
      }).returning('*');

      return { ...createdUser, role: 'ADMIN' };
    });

    const payload: JwtPayload = {
      userId: user.id,
      companyId: user.company_id,
      role: Role.ADMIN,
      mustChangePassword: false,
    };
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
    const { password_hash, reset_password_token, reset_password_expires, ...safeUser } = user;
    return { user: safeUser, token, refreshToken };
  }

  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError('Account not found');

    if (!user.must_change_password) {
      const isValidPassword = currentPassword ? await argon2.verify(user.password_hash, currentPassword) : false;
      if (!isValidPassword) throw new UnauthorizedError('Current password is incorrect');
    }

    await authRepository.updateUser(userId, {
      password_hash: await argon2.hash(newPassword),
      must_change_password: false,
    });
  }
  async forgotPassword(email: string) {
    const matchingUsers = await authRepository.findUsersByEmail(email);
    if (matchingUsers.length !== 1) {
      // Do not reveal if email exists, just return
      return;
    }
    const user = matchingUsers[0];

    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await authRepository.updateUser(user.id, {
      reset_password_token: token,
      reset_password_expires: expires,
    });

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    
    // Use the email service to send a real email (or Ethereal test email)
    await emailService.sendPasswordResetEmail(email, resetLink);
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await authRepository.findUserByResetToken(token);
    
    if (!user || !user.reset_password_expires || new Date() > user.reset_password_expires) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const hash = await argon2.hash(newPassword);

    await authRepository.updateUser(user.id, {
      password_hash: hash,
      reset_password_token: null,
      reset_password_expires: null,
    });
  }
}

export const authService = new AuthService();
