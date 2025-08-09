import { Router } from 'express';
import { getSleepData, getSleepByDeviceId, getSleepQualityStats } from '../controllers/sleep.controller';

const router = Router();

router.get('/', getSleepData);
router.get('/device/:deviceId', getSleepByDeviceId);
router.get('/stats/:deviceId', getSleepQualityStats);

export default router;
