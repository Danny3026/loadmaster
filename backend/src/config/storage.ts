import { env } from './env';
import path from 'path';

export const storageConfig = {
  type: env.STORAGE_TYPE,
  local: {
    path: path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH),
  },
};
