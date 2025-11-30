import { query } from '../config/db.js';

async function run() {
  try {
    const res = await query("SELECT to_regclass('public.admins') AS admins, to_regclass('public.products') AS products;");
    console.log('Table existence:', res.rows);

    const counts = await query('SELECT (SELECT COUNT(*) FROM admins) AS admins_count, (SELECT COUNT(*) FROM products) AS products_count;');
    console.log('Current counts:', counts.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error checking tables:', err.message || err);
    process.exit(1);
  }
}

run();
