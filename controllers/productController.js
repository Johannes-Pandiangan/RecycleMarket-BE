import { query } from '../config/db.js';
import cloudinary from '../config/cloudinaryConfig.js';

const getAdminDetails = async (adminId) => {
    const res = await query('SELECT name, phone, location FROM admins WHERE id = $1', [adminId]);
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
    };
};

// @desc    Mendapatkan semua produk yang tersedia (untuk halaman Home)
// @route   GET /api/products/available
export const getAvailableProducts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE stock > 0 ORDER BY created_at DESC');
    
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
    const formattedProducts = result.rows.map(product => ({
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
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error getting admin products:', error);
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
      
      const newProduct = await formatProductResponse(result.rows[0]);
      
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
      const newStock = parseInt(stock) !== undefined ? parseInt(stock) : currentProduct.stock;
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
      
      const updatedProduct = await formatProductResponse(result.rows[0]);
      
      res.json(updatedProduct);
  } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Menghapus produk
// @route   DELETE /api/products/:id
// @access  Private (Admin Only)
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin.id;

  try {
    const result = await query('DELETE FROM products WHERE id = $1 AND admin_id = $2 RETURNING id', [id, adminId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan atau Anda tidak memiliki izin untuk menghapus' });
    }

    res.json({ message: 'Produk berhasil dihapus', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};