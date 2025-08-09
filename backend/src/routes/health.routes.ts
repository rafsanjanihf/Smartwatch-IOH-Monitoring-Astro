import { Router } from 'express';
import {
  getHealthData,
  getHealthByDeviceId,
  getHealthByDeviceReport,
  getSleepQualityStats,
} from '../controllers/health.controller';

const router = Router();

router.get('/', getHealthData);
router.get('/device/:deviceId', getHealthByDeviceId);
router.get('/device/:deviceId/report', getHealthByDeviceReport);
// router.get('/device/:deviceId/stats', getSleepQualityStats);

export default router;
