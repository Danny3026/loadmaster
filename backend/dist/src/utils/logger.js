import winston from 'winston';
import { env } from '../config/env';
const format = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston.format.colorize({ all: true }), winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
const transports = [
    new winston.transports.Console(),
];
export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    levels: winston.config.npm.levels,
    format,
    transports,
});
