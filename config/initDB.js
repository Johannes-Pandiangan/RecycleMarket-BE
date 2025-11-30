import { query } from './db.js';
import bcrypt from 'bcryptjs';

export const createTables = async () => {
  // Query SQL untuk membuat tabel admins
  const adminTable = `
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      phone VARCHAR(20),
      location VARCHAR(100),
      password VARCHAR(255) NOT NULL
    );
  `;

  // Query SQL untuk membuat tabel products
  const productTable = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price VARCHAR(50) NOT NULL,
      image TEXT,
      stock INTEGER DEFAULT 0,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log("Memulai pembuatan tabel...");
    await query(adminTable);
    await query(productTable);
    console.log("Tabel 'admins' dan 'products' berhasil dibuat atau sudah ada.");

    // Tambahkan dummy admin jika belum ada (sesuai AuthContext di frontend)
    const res = await query('SELECT * FROM admins WHERE email = $1', ['admin@test.com']);
    if (res.rowCount === 0) {
        const hashedPassword = await bcrypt.hash('123456', 10); 
        const dummyAdmin = `
            INSERT INTO admins (name, email, phone, location, password)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        await query(dummyAdmin, ['Admin Test', 'admin@test.com', '081234567890', 'Jakarta', hashedPassword]);
        console.log("Dummy admin ('admin@test.com', pass: '123456') ditambahkan.");
    }
    
  } catch (err) {
    console.error("Kesalahan saat membuat tabel:", err);
  }
};

// NOTE: don't exit the process here. This module exports createTables()
// so other code (like server.js) can call it at startup.

// If this file is executed directly (node config/initDB.js), run the initializer
// and then exit. This keeps behavior safe when imported by server.js.
try {
  const executedDirectly = process.argv[1] && (
    process.argv[1].endsWith('initDB.js') ||
    process.argv[1].endsWith('config\\initDB.js') ||
    process.argv[1].endsWith('config/initDB.js')
  );

  if (executedDirectly) {
    (async () => {
      try {
        await createTables();
        process.exit(0);
      } catch (err) {
        console.error('Error running init script directly:', err);
        process.exit(1);
      }
    })();
  }
} catch (err) {
  // ignore detection errors
}
