// src/app.js
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { env } from './config/env.js';

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DPRIMS backend is running',
  });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default app;