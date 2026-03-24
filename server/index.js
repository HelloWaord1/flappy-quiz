import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import leadsRouter from './routes/leads.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/leads', leadsRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
