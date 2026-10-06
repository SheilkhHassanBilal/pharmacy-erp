const pool = require('../db');

exports.getAlerts = async (req, res) => {
  try {
    const days = Number(req.query.days) || 90;

    const lowStock = pool.query(
      `SELECT p.id, p.name, p.reorder_level,
              COALESCE(SUM(b.stock_quantity_in_base_units), 0)::int AS total_stock
         FROM products p
         LEFT JOIN inventory_batches b
           ON b.product_id = p.id AND b.expiry_date > CURRENT_DATE
        GROUP BY p.id
       HAVING COALESCE(SUM(b.stock_quantity_in_base_units), 0) <= p.reorder_level
        ORDER BY total_stock ASC`
    );

    const nearExpiry = pool.query(
      `SELECT b.id AS batch_id, p.name,
              b.stock_quantity_in_base_units AS quantity, b.expiry_date,
              (b.expiry_date - CURRENT_DATE) AS days_left
         FROM inventory_batches b
         JOIN products p ON p.id = b.product_id
        WHERE b.stock_quantity_in_base_units > 0
          AND b.expiry_date > CURRENT_DATE
          AND b.expiry_date <= CURRENT_DATE + $1::int
        ORDER BY b.expiry_date ASC`,
      [days]
    );

    const expired = pool.query(
      `SELECT b.id AS batch_id, p.name,
              b.stock_quantity_in_base_units AS quantity, b.expiry_date
         FROM inventory_batches b
         JOIN products p ON p.id = b.product_id
        WHERE b.stock_quantity_in_base_units > 0
          AND b.expiry_date <= CURRENT_DATE
        ORDER BY b.expiry_date ASC`
    );

    const [l, n, e] = await Promise.all([lowStock, nearExpiry, expired]);
    res.json({ success: true, lowStock: l.rows, nearExpiry: n.rows, expired: e.rows });
  } catch (err) {
    console.error('Alerts error:', err);
    res.status(500).json({ success: false, message: 'Failed to load alerts' });
  }
};