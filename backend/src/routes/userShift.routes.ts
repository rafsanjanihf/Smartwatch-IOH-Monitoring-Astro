import { Router } from 'express';
import { 
  getUserShifts, 
  getUserShiftsByDate, 
  getUserShiftById, 
  getScheduleStats,
  createUserShift,
  updateUserShift,
  deleteUserShift
} from '../controllers/userShift.controller';

const router = Router();

// GET /api/user-shifts - Get all user shifts with optional filters
router.get('/', getUserShifts);

// GET /api/user-shifts/stats - Get schedule statistics
router.get('/stats', getScheduleStats);

// GET /api/user-shifts/date/:date - Get user shifts by specific date
router.get('/date/:date', getUserShiftsByDate);

// GET /api/user-shifts/:id - Get user shift by ID
router.get('/:id', getUserShiftById);

// POST /api/user-shifts - Create new user shift
router.post('/', createUserShift);

// PUT /api/user-shifts - Update user shift (upsert)
router.put('/', updateUserShift);

// DELETE /api/user-shifts - Delete user shift
router.delete('/', deleteUserShift);

export default router;