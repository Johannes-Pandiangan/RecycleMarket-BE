import express from 'express';
import { registerAdmin, loginAdmin } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerAdmin); // POST /api/auth/register
router.post('/login', loginAdmin);     // POST /api/auth/login

export default router;