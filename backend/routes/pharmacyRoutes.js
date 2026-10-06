const express = require('express');
const router = express.Router();

const notImplemented = (req, res) =>
  res.status(501).json({ success: false, message: 'Not implemented' });

const pharmacyController = require('../controllers/pharmacyController') || {};
const inventoryController = require('../controllers/inventoryController') || {};

const getMedicines = pharmacyController.getMedicines || notImplemented;
const addProduct = pharmacyController.addProduct || notImplemented;
const deleteProduct = pharmacyController.deleteProduct || notImplemented;
const checkout = pharmacyController.checkout || notImplemented;
const receiveGoods = pharmacyController.receiveGoods || notImplemented;
const updateSupplierKhata = pharmacyController.updateSupplierKhata || notImplemented;
const getDashboardStats = pharmacyController.getDashboardStats || notImplemented;
const getSalesHistory = pharmacyController.getSalesHistory || notImplemented;
const getSuppliers = pharmacyController.getSuppliers || notImplemented;
const addSupplier = pharmacyController.addSupplier || notImplemented;
const getInventoryAlerts =
  pharmacyController.getInventoryAlerts || inventoryController.getAlerts || notImplemented;

const { login } = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/rbac');

// 1. Auth
router.post('/auth/login', login);

// 2. Medicines
router.get('/medicines', getMedicines);

// 3. Products (add, delete) - manager & admin
router.post('/products', verifyToken, requireRole(['manager', 'admin']), addProduct);
router.delete('/products/:id', verifyToken, requireRole(['manager', 'admin']), deleteProduct);

// 4. POS checkout
router.post('/pos/checkout', verifyToken, requireRole(['cashier', 'manager', 'admin']), checkout);

// 5. Sales history
router.get('/sales/history', verifyToken, requireRole(['cashier', 'manager', 'admin']), getSalesHistory);

// 6. GRN / stock receiving
router.post('/grn', verifyToken, requireRole(['manager', 'admin']), receiveGoods);

// 7. Inventory alerts
router.get('/inventory/alerts', verifyToken, requireRole(['manager', 'admin']), getInventoryAlerts);

// 8. Suppliers (list, add) and khata
router.get('/suppliers', verifyToken, requireRole(['manager', 'admin']), getSuppliers);
router.post('/suppliers', verifyToken, requireRole(['manager', 'admin']), addSupplier);
router.post('/suppliers/khata', verifyToken, requireRole(['manager', 'admin']), updateSupplierKhata);

// 9. Dashboard stats
router.get('/dashboard/stats', verifyToken, requireRole(['manager', 'admin']), getDashboardStats);

module.exports = router;