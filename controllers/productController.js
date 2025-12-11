import { query } from '../config/db.js';
import cloudinary from '../config/cloudinaryConfig.js';

const getAdminDetails = async (adminId) => {
    // Sertakan is_super_admin
    const res = await query('SELECT name, phone, location, is_super_admin FROM admins WHERE id = $1', [adminId]);
    return res.rows[0];
}
const formatProductResponse = async (product) => {
    const adminDetails = await getAdminDetails(product.admin_id);
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        stock: product.stock,
        status: product.status,
        createdAt: product.created_at,
        adminId: product.admin_id.toString(), // Ubah ke string agar konsisten dengan Date.now().toString() di frontend
        sellerName: adminDetails.name,
        sellerPhone: adminDetails.phone,
        location: adminDetails.location,
        isSuperAdmin: adminDetails.is_super_admin, // BARU
    };
};
// Helper untuk format respons produk tanpa memuat ulang detail admin jika sudah tersedia
const formatProductResponseSimple = (product, adminData) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    image: product.image,
    stock: product.stock,
    status: product.status,
    createdAt: product.created_at,
    adminId: product.admin_id.toString(), 
    sellerName: adminData.name,
    sellerPhone: adminData.phone,
    location: adminData.location,
    isSuperAdmin: adminData.is_super_admin, // BARU
});


// @desc    Mendapatkan semua produk yang tersedia (untuk halaman Home)
// @route   GET /api/products/available
export const getAvailableProducts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE stock > 0 ORDER BY created_at DESC');
    
    // NOTE: Ini akan memanggil getAdminDetails berkali-kali. Bisa dioptimasi tapi biarkan dulu untuk menjaga struktur.
    const formattedProducts = await Promise.all(result.rows.map(formatProductResponse));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error getting available products:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mendapatkan produk milik admin yang sedang login
// @route   GET /api/products/mine
// @access  Private (Admin Only)
export const getMyProducts = async (req, res) => {
  const adminId = req.admin.id; 

  try {
    const result = await query('SELECT * FROM products WHERE admin_id = $1 ORDER BY created_at DESC', [adminId]);
    
    // Gunakan data admin yang sudah ada di req.admin untuk efisiensi
    const adminData = req.admin;
    const formattedProducts = result.rows.map(product => formatProductResponseSimple(product, adminData));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error getting admin products:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mendapatkan SEMUA produk (Super Admin Only)
// @route   GET /api/products/all
// @access  Private (Super Admin Only)
export const getAllProducts = async (req, res) => {
    try {
        const result = await query('SELECT * FROM products ORDER BY created_at DESC');
        
        // Perlu mendapatkan detail admin untuk setiap produk
        const formattedProducts = await Promise.all(result.rows.map(formatProductResponse));
        
        res.json(formattedProducts);
    } catch (error) {
        console.error('Error getting all products for Super Admin:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


// @desc    Menambah produk baru
// @route   POST /api/products
// @access  Private (Admin Only)
export const addProduct = async (req, res) => {
  const { name, description, price, stock } = req.body;
  const adminId = req.admin.id;
  const initialStock = parseInt(stock) || 0;
  const status = initialStock > 0 ? "Tersedia" : "Terjual";
  
  // 1. Cek apakah ada file yang diunggah oleh Multer
  if (!req.file) {
      return res.status(400).json({ message: 'Harap unggah file gambar untuk produk.' });
  }

  let imageUrl = ''; // Inisialisasi URL gambar

  try {
      // 2. Upload file ke Cloudinary dari buffer (req.file.buffer)
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
      
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
          folder: 'recycle_market_products', // Nama folder untuk produk Anda
          // public_id yang unik
          public_id: `${req.admin.id}-${Date.now()}-${req.file.originalname.split('.')[0]}` 
      });

      imageUrl = uploadResponse.secure_url; // Ambil URL aman dari Cloudinary

      // 3. Simpan data produk ke database, gunakan imageUrl
      const insertQuery = `
        INSERT INTO products (admin_id, name, description, price, image, stock, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const result = await query(insertQuery, [adminId, name, description, price, imageUrl, initialStock, status]);
      
      const newProduct = formatProductResponseSimple(result.rows[0], req.admin);
      
      res.status(201).json(newProduct);
  } catch (error) {
      console.error('Error adding product or uploading to Cloudinary:', error);
      // Anda mungkin ingin menambahkan res.status(500).json(...) di sini jika terjadi error
      res.status(500).json({ message: 'Server error saat menambah produk atau mengunggah gambar' });
  }
};

// @desc    Mengubah detail produk (termasuk stok/status)
// @route   PUT /api/products/:id
// @access  Private (Admin Only)
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin.id;
  const { name, description, price, stock } = req.body;
  
  try {
      const currentProductRes = await query('SELECT * FROM products WHERE id = $1 AND admin_id = $2', [id, adminId]);
      
      if (currentProductRes.rowCount === 0) {
          return res.status(404).json({ message: 'Produk tidak ditemukan atau Anda tidak memiliki izin untuk mengedit' });
      }
      
      const currentProduct = currentProductRes.rows[0];
      let newImageUrl = currentProduct.image;
      
      // Jika ada file baru yang diunggah, upload ke Cloudinary dan perbarui URL gambar
      if (req.file) {
          const b64 = Buffer.from(req.file.buffer).toString('base64');
          const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
          
          const uploadResponse = await cloudinary.uploader.upload(dataURI, {
              folder: 'recycle_market_products',
              public_id: `${req.admin.id}-${Date.now()}-${req.file.originalname.split('.')[0]}`
          });

          newImageUrl = uploadResponse.secure_url;
      }
      
      // Menggunakan nilai baru, atau nilai lama jika tidak ada di request
      const newStock = stock !== undefined ? parseInt(stock) : currentProduct.stock;
      const newStatus = newStock > 0 ? "Tersedia" : "Terjual";

      const updateQuery = `
          UPDATE products
          SET name = $1, description = $2, price = $3, image = $4, stock = $5, status = $6
          WHERE id = $7 AND admin_id = $8
          RETURNING *;
      `;
      const result = await query(updateQuery, [
          name ?? currentProduct.name, 
          description ?? currentProduct.description, 
          price ?? currentProduct.price, 
          newImageUrl,
          newStock, 
          newStatus, 
          id, 
          adminId
      ]);
      
      const updatedProduct = formatProductResponseSimple(result.rows[0], req.admin);
      
      res.json(updatedProduct);
  } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Menghapus produk
// @route   DELETE /api/products/:id
// @access  Private (Admin Only / Super Admin Only if deleting others' product)
// Note: Karena rute ini sudah dilindungi oleh `protect`, kita hanya perlu cek apakah admin_id cocok atau user adalah super admin.
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin.id;
  const isSuperAdmin = req.admin.is_super_admin;
  
  try {
      // Cek kepemilikan produk untuk user biasa
      const checkProductRes = await query('SELECT admin_id FROM products WHERE id = $1', [id]);
      
      if (checkProductRes.rowCount === 0) {
          return res.status(404).json({ message: 'Produk tidak ditemukan' });
      }
      
      const productAdminId = checkProductRes.rows[0].admin_id;
      
      // Jika bukan Super Admin dan bukan pemilik produk, tolak akses
      if (!isSuperAdmin && productAdminId !== adminId) {
          return res.status(403).json({ message: 'Akses Ditolak: Anda hanya dapat menghapus produk Anda sendiri' });
      }

    // Hapus produk
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    // Jika Super Admin menghapus produk seller lain, tidak perlu cek `admin_id` di klausa WHERE, 
    // cukup pastikan produk ada dan hapus. Logika di atas sudah menangani otorisasi.
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    res.status(204).end(); // 204 No Content for successful deletion
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};