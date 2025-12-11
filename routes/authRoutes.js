import express from 'express';
import { registerAdmin, loginAdmin, getAllAdmins, deleteAdmin } from '../controllers/authController.js';
import { protect, superAdminProtect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/register', registerAdmin); // POST /api/auth/register
router.post('/login', loginAdmin);     // POST /api/auth/login

// Rute untuk Super Admin (Daftar semua admin/seller & hapus)
router.use('/admins', protect, superAdminProtect); // Lindungi semua rute di bawah dengan Super Admin check

router.get('/admins', getAllAdmins);        // GET /api/auth/admins
router.delete('/admins/:id', deleteAdmin);  // DELETE /api/auth/admins/:id

export default router;