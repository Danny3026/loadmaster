import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storageConfig } from '../config/storage';
export class LocalStorageService {
    getBasePath() {
        return path.resolve(storageConfig.local.path);
    }
    async uploadFile(companyId, loadId, file) {
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
    getFileStream(storageKey) {
        const fullPath = path.join(this.getBasePath(), storageKey);
        if (!fs.existsSync(fullPath)) {
            throw new Error('File not found in storage');
        }
        return fs.createReadStream(fullPath);
    }
    async deleteFile(storageKey) {
        const fullPath = path.join(this.getBasePath(), storageKey);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
}
export const getStorageService = () => {
    return new LocalStorageService();
};
