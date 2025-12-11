import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Fungsi helper untuk membuat JWT
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Daftar Admin baru
// @route   POST /api/auth/register
export const registerAdmin = async (req, res) => {
  // is_super_admin tidak boleh dikirim dari frontend, defaultnya FALSE
  const { name, email, phone, location, password } = req.body;

  try {
    // 1. Cek jika email sudah terdaftar
    const checkUser = await query('SELECT * FROM admins WHERE email = $1', [email]);
    if (checkUser.rowCount > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar!' });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Simpan Admin baru (default is_super_admin = FALSE)
    const result = await query(
      'INSERT INTO admins (name, email, phone, location, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, location, is_super_admin',
      [name, email, phone, location, hashedPassword]
    );

    const admin = result.rows[0];

    // 4. Kirim response (sesuai format AuthContext frontend)
    res.status(201).json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      location: admin.location,
      isSuperAdmin: admin.is_super_admin, // BARU
      token: generateToken(admin.id),
    });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login Admin
// @route   POST /api/auth/login
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Cek Admin berdasarkan email
    const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];

    if (admin && (await bcrypt.compare(password, admin.password))) {
      // 2. Admin ditemukan dan password cocok
      res.json({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        location: admin.location,
        isSuperAdmin: admin.is_super_admin, // BARU
        token: generateToken(admin.id),
      });
    } else {
      // 3. Admin tidak ditemukan atau password salah
      res.status(401).json({ message: 'Email atau password salah' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mendapatkan semua Admin/Seller (Super Admin Only)
// @route   GET /api/auth/admins
export const getAllAdmins = async (req, res) => {
    // Middleware superAdminProtect sudah memastikan yang akses adalah Super Admin
    try {
        // Ambil semua admin/seller dari tabel admins
        const result = await query('SELECT id, name, email, phone, location, is_super_admin FROM admins ORDER BY id ASC');
        res.json(result.rows.map(admin => ({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            location: admin.location,
            isSuperAdmin: admin.is_super_admin,
            // createdAt tidak perlu karena kolom tersebut tidak ada di tabel admins awal
        })));
    } catch (error) {
        console.error('Error getting all admins:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Menghapus Admin/Seller (Super Admin Only)
// @route   DELETE /api/auth/admins/:id
export const deleteAdmin = async (req, res) => {
    const { id } = req.params;
    const adminIdToDelete = parseInt(id);

    try {
        // Mencegah Super Admin menghapus dirinya sendiri
        if (req.admin.id === adminIdToDelete) {
             return res.status(400).json({ message: 'Tidak dapat menghapus akun Anda sendiri' });
        }
        
        // Hapus Admin dari tabel admins
        const result = await query('DELETE FROM admins WHERE id = $1 RETURNING id', [adminIdToDelete]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Admin tidak ditemukan' });
        }

        res.status(204).end(); // 204 No Content for successful deletion
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ message: 'Server error' });
    }
};