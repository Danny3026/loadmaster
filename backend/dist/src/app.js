import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { error } from './utils/response';
import db from './config/database';
const app = express();
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(morgan(env.LOG_LEVEL === 'info' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/storage/:companyId/:fileName', async (req, res, next) => {
    const { companyId, fileName } = req.params;
    if (!/^[0-9a-f-]{36}$/i.test(companyId) || !new RegExp(`^company-${companyId}-logo(?:-[a-f0-9]{16})?\\.(png|jpg|webp)$`, 'i').test(fileName)) {
        res.sendStatus(404);
        return;
    }
    try {
        const logoUrl = `/storage/${companyId}/${fileName}`;
        const company = await db('companies').where({ id: companyId, logo_url: logoUrl }).first('id');
        if (!company) {
            res.sendStatus(404);
            return;
        }
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.sendFile(fileName, { root: path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH, companyId) }, next);
    }
    catch (err) {
        next(err);
    }
});
app.use('/api', routes);
app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json(error(message, err.code));
});
export default app;
