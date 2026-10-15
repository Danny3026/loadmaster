import knex from 'knex';
import { env } from './env';
import knexConfig from '../../knexfile';

const environment = env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

export default db;
