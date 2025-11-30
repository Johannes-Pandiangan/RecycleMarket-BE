import express from 'express';
import { 
  getAvailableProducts, 
  getMyProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js'; // <-- BARU

const router = express.Router();

// Rute Publik (untuk halaman Home)
router.get('/available', getAvailableProducts); // GET /api/products/available

// Semua rute di bawah ini memerlukan admin login (Middleware protect)
router.use(protect); 

router.get('/mine', getMyProducts);
router.post('/', upload.single('image'), addProduct);
router.put('/:id', upload.single('image'), updateProduct);           
router.delete('/:id', deleteProduct);

export default router;