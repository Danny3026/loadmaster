import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitializing = false;

  constructor() {
    this.initTransporter();
  }

  private async initTransporter() {
    this.isInitializing = true;
    try {
      if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
        // Use provided SMTP settings
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT || 587,
          secure: env.SMTP_PORT === 465,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
        logger.info('SMTP transporter configured with provided credentials.');
      } else {
        // Fallback to Ethereal Email for development/testing
        logger.info('No SMTP credentials found in .env. Generating a test Ethereal Email account...');
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        logger.info(`Ethereal Email test account created: ${testAccount.user}`);
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  private async waitForInitialization() {
    while (this.isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    await this.waitForInitialization();

    if (!this.transporter) {
      logger.error('Email transporter is not initialized. Cannot send email.');
      return;
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p style="color: #334155; font-size: 16px;">
          Hello,
        </p>
        <p style="color: #334155; font-size: 16px;">
          We received a request to reset your password for your LoadMaster Dispatch account. 
          Click the button below to choose a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #334155; font-size: 16px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="background-color: #f1f5f9; padding: 10px; border-radius: 4px; font-size: 14px; word-break: break-all; color: #475569;">
          ${resetLink}
        </p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.
        </p>
      </div>
    `;

    const mailOptions = {
      from: env.SMTP_FROM,
      to,
      subject: 'Reset Your LoadMaster Password',
      text: `To reset your password, please visit this link: ${resetLink}`,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${to}. Message ID: ${info.messageId}`);
      
      // If using Ethereal, log the preview URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`\n========================================================`);
        console.log(`📧 Preview real email sent to ${to}:`);
        console.log(previewUrl);
        console.log(`========================================================\n`);
      }
    } catch (error) {
      logger.error(`Failed to send password reset email to ${to}:`, error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
