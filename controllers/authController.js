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

    // 3. Simpan Admin baru
    const result = await query(
      'INSERT INTO admins (name, email, phone, location, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, location',
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
