import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Impor konfigurasi database (untuk koneksi)
import './config/db.js'; 
import { createTables } from './config/initDB.js';
// Impor rute
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';

// Konfigurasi dotenv
dotenv.config();

const app = express();

// Middleware Utama
app.use(cors({
    origin: 'https://recycle-market-fe.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json()); // Body parser untuk JSON

// Definisi Rute API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Rute Test
app.get('/', (req, res) => {
  res.send('ReCycle Market Backend Running!');
});

// Middleware untuk menangani error 404
app.use((req, res, next) => {
  res.status(404).json({ message: `Route Not Found: ${req.originalUrl}` });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await createTables();
  } catch (err) {
    console.error('Error while initializing DB:', err);
  }

  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};


start();
