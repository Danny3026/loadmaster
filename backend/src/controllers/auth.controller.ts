import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { success } from '../utils/response';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUserById(req.user!.userId);
    if (!user) {
      res.json(success(req.user));
      return;
    }
    const { password_hash, reset_password_token, reset_password_expires, ...safeUser } = user;
    res.json(success(safeUser));
  } catch (err) {
    next(err);
  }
};
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json(success({ message: 'Password changed successfully.' }));
  } catch (err) {
    next(err);
  }
};
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    res.json(success({ message: 'If that email exists, we sent a password reset link.' }));
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json(success({ message: 'Password has been successfully reset.' }));
  } catch (err) {
    next(err);
  }
};
