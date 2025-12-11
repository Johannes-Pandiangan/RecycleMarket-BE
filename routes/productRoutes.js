import express from 'express';
import { 
  getAvailableProducts, 
  getMyProducts, 
  getAllProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/productController.js';
import { protect, superAdminProtect } from '../middleware/authMiddleware.js'; 
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/available', getAvailableProducts); 

router.get('/all', protect, superAdminProtect, getAllProducts); 

router.use(protect); 

router.get('/mine', getMyProducts);
router.post('/', upload.single('image'), addProduct);
router.put('/:id', upload.single('image'), updateProduct);           
router.delete('/:id', deleteProduct); 

export default router;