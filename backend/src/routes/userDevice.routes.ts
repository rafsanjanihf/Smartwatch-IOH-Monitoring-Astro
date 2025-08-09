import { Router } from 'express';
import { getUserDevices, getUserDeviceById } from '../controllers/userDevice.controller';

const router = Router();

router.get('/', getUserDevices);
router.get('/:id', getUserDeviceById);

export default router;
