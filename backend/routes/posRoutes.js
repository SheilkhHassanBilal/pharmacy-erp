const router = require('express').Router();
const { checkout, getInvoice } = require('../controllers/salesController');
const { getAlerts } = require('../controllers/inventoryController');

router.post('/sales/checkout', checkout);
router.get('/sales/:id', getInvoice);
router.get('/inventory/alerts', getAlerts);

module.exports = router;