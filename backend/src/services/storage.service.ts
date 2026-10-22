import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storageConfig } from '../config/storage';

export interface IStorageService {
  uploadFile(companyId: string, loadId: string, file: Express.Multer.File): Promise<string>;
  saveBuffer(storageKey: string, buffer: Buffer): Promise<void>;
  getFileStream(storageKey: string): NodeJS.ReadableStream;
  deleteFile(storageKey: string): Promise<void>;
}

export class LocalStorageService implements IStorageService {
  private getBasePath() {
    return path.resolve(storageConfig.local.path);
  }

  private resolveStoragePath(storageKey: string) {
    const basePath = this.getBasePath();
    const fullPath = path.resolve(basePath, storageKey);
    const relativePath = path.relative(basePath, fullPath);
    if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      throw new Error('Invalid storage key');
    }
    return fullPath;
  }

  async uploadFile(companyId: string, loadId: string, file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const relativeDir = path.join(companyId, loadId);
    const fullDir = path.join(this.getBasePath(), relativeDir);
    
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const fullPath = path.join(fullDir, fileName);
    fs.copyFileSync(file.path, fullPath);
    fs.unlinkSync(file.path);

    return path.join(relativeDir, fileName).replace(/\\/g, '/');
  }

  async saveBuffer(storageKey: string, buffer: Buffer): Promise<void> {
    const fullPath = this.resolveStoragePath(storageKey);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, buffer, { flag: 'wx' });
  }

  getFileStream(storageKey: string): NodeJS.ReadableStream {
    const fullPath = this.resolveStoragePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found in storage');
    }
    return fs.createReadStream(fullPath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const fullPath = this.resolveStoragePath(storageKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

export const getStorageService = (): IStorageService => {
  return new LocalStorageService();
};
