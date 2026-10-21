import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

const backendRoot = path.basename(__dirname) === 'dist' ? path.dirname(__dirname) : __dirname;
dotenv.config({ path: path.resolve(backendRoot, '.env') });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(backendRoot, 'src/database/migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.resolve(backendRoot, 'src/database/seeds'),
      extension: 'ts',
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: path.resolve(backendRoot, 'dist/src/database/migrations'),
      extension: 'js',
    },
    seeds: {
      directory: path.resolve(backendRoot, 'dist/src/database/seeds'),
      extension: 'js',
    },
  },
};

export default config;
