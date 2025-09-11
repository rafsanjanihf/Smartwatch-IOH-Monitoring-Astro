import { Router } from 'express';
import { getSleepData, getSleepByDeviceId, getSleepQualityStats, getSleepStatsByDate } from '../controllers/sleep.controller';

const router = Router();

router.get('/', getSleepData);
router.get('/device/:deviceId', getSleepByDeviceId);
router.get('/stats/:deviceId', getSleepQualityStats);
router.get('/statsByDate', getSleepStatsByDate);

export default router;
