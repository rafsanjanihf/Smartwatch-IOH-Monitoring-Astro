import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import deviceRoutes from './routes/device.routes';
import healthRoutes from './routes/health.routes';
import sleepRoutes from './routes/sleep.routes';
import userDeviceRoutes from './routes/userDevice.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3013;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/sleep', sleepRoutes);
app.use('/api/user-devices', userDeviceRoutes);

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
