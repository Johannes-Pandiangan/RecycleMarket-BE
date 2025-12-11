import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req, res, next) => {
  let token;

  // 1. Cek token di header Authorization (Bearer TOKEN)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // 2. Verifikasi token
      const decoded = jwt.verify(token, JWT_SECRET);

      // 3. Cari admin (tanpa password) dan tambahkan ke request
      // Tambahkan is_super_admin
      const result = await query(
        'SELECT id, name, email, phone, location, is_super_admin FROM admins WHERE id = $1', 
        [decoded.id]
      );
      
      if (result.rowCount === 0) {
        return res.status(401).json({ message: 'Tidak diizinkan, admin tidak ditemukan' });
      }
      
      req.admin = result.rows[0]; 
      next();
      
    } catch (error) {
      console.error('JWT Error:', error.message);
      return res.status(401).json({ message: 'Tidak diizinkan, token tidak valid' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Tidak diizinkan, tidak ada token' });
  }
};

// Middleware BARU: Hanya izinkan Super Admin
export const superAdminProtect = (req, res, next) => {
    // Diasumsikan middleware `protect` sudah dijalankan sebelumnya dan req.admin sudah terisi.
    if (!req.admin || !req.admin.is_super_admin) {
        return res.status(403).json({ message: 'Akses Ditolak: Hanya Super Admin yang diizinkan' });
    }
    next();
};