import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

// Konfigurasi koneksi database
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('connect', () => {
  console.log('Berhasil terhubung ke database');
});

pool.on('error', (err) => {
  console.error('Terjadi kesalahan pada klien database', err.stack);
});

// Fungsi untuk menjalankan query SQL
export const query = (text, params) => pool.query(text, params);