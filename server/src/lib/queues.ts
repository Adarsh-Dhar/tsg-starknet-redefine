import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = {
	host: process.env.REDIS_HOST || '127.0.0.1',
	port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
	password: process.env.REDIS_PASSWORD || undefined,
	db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0,
};

export const slashQueue = new Queue('slash', { connection });
