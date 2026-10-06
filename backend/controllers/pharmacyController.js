const pool = require('../db');

// ---------- Medicines ----------
exports.getMedicines = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const result = await pool.query(
      `SELECT p.id, p.name, p.generic_salt, p.category, p.barcode,
              p.sale_price_per_unit AS price,
              COALESCE(SUM(b.stock_quantity_in_base_units)
                FILTER (WHERE b.expiry_date > CURRENT_DATE), 0)::int AS stock
         FROM products p
         LEFT JOIN inventory_batches b ON b.product_id = p.id
        WHERE ($1::text = ''
               OR p.name ILIKE '%' || $1::text || '%'
               OR p.generic_salt ILIKE '%' || $1::text || '%'
               OR p.barcode ILIKE '%' || $1::text || '%')
        GROUP BY p.id
        ORDER BY p.name`,
      [search]
    );
    res.json({ success: true, medicines: result.rows });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      generic_salt,
      category,
      barcode,
      sale_price_per_unit,
      purchase_price_per_unit,
      tax_rate
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products
         (name, generic_salt, category, barcode, sale_price_per_unit, purchase_price_per_unit, tax_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        name,
        generic_salt || null,
        category,
        (barcode || '').trim() || null,
        sale_price_per_unit,
        purchase_price_per_unit || 0,
        tax_rate || 0
      ]
    );
    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (err) {
    // 23505 = yeh barcode pehle se kisi aur medicine ka hai
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Yeh barcode pehle se kisi aur medicine ke saath hai.'
      });
    }
    console.error('Add product error:', err);
    res.status(500).json({ success: false, message: 'Failed to add product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    // 23503 = is product ki sale ho chuki hai, isliye delete nahi ho sakta
    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Is medicine ki sales ho chuki hain, isliye delete nahi ho sakti.'
      });
    }
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

// ---------- GRN (stock receiving) ----------
exports.receiveGoods = async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const b = req.body;
    const productId = b.product_id || b.medicine_id || b.productId;
    const batchNumber = b.batch_number || b.batchNumber;
    const quantity = Number(b.quantity);
    const expiryDate = b.expiry_date || b.expiryDate;
    const costPrice = Number(b.cost_price ?? b.costPrice ?? 0);
    const newSalePrice = b.new_sale_price || b.sale_price || b.salePrice;

    if (!productId || !batchNumber || !quantity || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await client.query('BEGIN');
    const prod = await client.query('SELECT conversion_factor FROM products WHERE id = $1', [productId]);
    if (prod.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const baseUnits = quantity * (prod.rows[0].conversion_factor || 1);

    await client.query(
      `INSERT INTO inventory_batches
         (product_id, batch_number, expiry_date, cost_price, stock_quantity_in_base_units)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, batchNumber, expiryDate, costPrice, baseUnits]
    );
    if (newSalePrice) {
      await client.query('UPDATE products SET sale_price_per_unit = $1 WHERE id = $2', [newSalePrice, productId]);
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Stock added' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('GRN error:', err);
    res.status(500).json({ success: false, message: 'Failed to add stock' });
  } finally {
    if (client) client.release();
  }
};

// ---------- POS checkout (FEFO) ----------
exports.checkout = async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const items = req.body.items || req.body.cart || [];
    const discount = Number(req.body.discount?.value ?? req.body.discount ?? 0) || 0;
    const paymentMethod = req.body.payment_method || req.body.paymentMethod || 'cash';
    if (!items.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    await client.query('BEGIN');
    const seq = await client.query("SELECT nextval('invoice_seq') AS n");
    const invoiceNo = `INV-${seq.rows[0].n}`;

    let subtotal = 0, totalTax = 0;
    const lines = [];

    for (const it of items) {
      const productId = it.product_id || it.id;
      let remaining = Number(it.quantity);
      const p = await client.query(
        'SELECT name, sale_price_per_unit, tax_rate FROM products WHERE id = $1', [productId]);
      if (!p.rows.length) throw new Error('Product not found');
      const name = p.rows[0].name;
      const price = Number(p.rows[0].sale_price_per_unit);
      const taxRate = Number(p.rows[0].tax_rate);

      const batches = await client.query(
        `SELECT id, stock_quantity_in_base_units AS qty, cost_price
           FROM inventory_batches
          WHERE product_id = $1 AND expiry_date > CURRENT_DATE AND stock_quantity_in_base_units > 0
          ORDER BY expiry_date ASC FOR UPDATE`, [productId]);

      for (const bt of batches.rows) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, bt.qty);
        await client.query(
          'UPDATE inventory_batches SET stock_quantity_in_base_units = stock_quantity_in_base_units - $1 WHERE id = $2',
          [take, bt.id]);
        const lineSub = take * price;
        const lineTax = lineSub * taxRate / 100;
        subtotal += lineSub; totalTax += lineTax;
        lines.push({
          productId, name, batchId: bt.id, qty: take, price,
          cost: bt.cost_price, tax: lineTax, total: lineSub + lineTax
        });
        remaining -= take;
      }
      if (remaining > 0) throw new Error('Insufficient stock');
    }

    const total = subtotal + totalTax - discount;
    const sale = await client.query(
      `INSERT INTO sales (invoice_no, cashier_id, subtotal, discount, tax, total, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [invoiceNo, req.user?.id || null, subtotal, discount, totalTax, total, paymentMethod]);

    for (const l of lines) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, cost_price, tax_amount, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sale.rows[0].id, l.productId, l.batchId, l.qty, l.price, l.cost, l.tax, l.total]);
    }

    await client.query('COMMIT');

    // Receipt ke liye: ek medicine ek line (batches ko jod kar)
    const itemMap = {};
    for (const l of lines) {
      if (!itemMap[l.productId]) {
        itemMap[l.productId] = { product_name: l.name, quantity: 0, unit_price: l.price, line_total: 0 };
      }
      itemMap[l.productId].quantity += l.qty;
      itemMap[l.productId].line_total += l.total;
    }

    res.status(201).json({
      success: true,
      invoice_no: invoiceNo,
      total,
      sale: {
        invoice_no: invoiceNo,
        created_at: sale.rows[0].created_at,
        subtotal,
        discount,
        tax: totalTax,
        total,
        payment_method: paymentMethod,
        items: Object.values(itemMap)
      }
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Checkout error:', err);
    const insufficient = err.message === 'Insufficient stock';
    res.status(insufficient ? 400 : 500).json({
      success: false,
      message: insufficient ? 'Insufficient stock' : 'Checkout failed'
    });
  } finally {
    if (client) client.release();
  }
};

// ---------- Sales history ----------
exports.getSalesHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.invoice_no, s.subtotal, s.discount, s.tax, s.total,
              s.payment_method, s.created_at, u.username AS cashier,
              COALESCE((
                SELECT json_agg(json_build_object(
                         'product_name', p.name,
                         'quantity', si.quantity,
                         'unit_price', si.unit_price,
                         'line_total', si.line_total))
                  FROM sale_items si
                  JOIN products p ON p.id = si.product_id
                 WHERE si.sale_id = s.id), '[]'::json) AS items
         FROM sales s
         LEFT JOIN users u ON u.id = s.cashier_id
        ORDER BY s.created_at DESC
        LIMIT 100`
    );
    res.json({ success: true, sales: result.rows });
  } catch (err) {
    console.error('Sales history error:', err);
    res.status(500).json({ success: false, message: 'Failed to load sales' });
  }
};

// ---------- Inventory alerts ----------
exports.getInventoryAlerts = async (req, res) => {
  try {
    const days = Number(req.query.days) || 90;

    const [low, near, expired] = await Promise.all([
      pool.query(
        `SELECT p.name, NULL::text AS batch_number, NULL::date AS expiry_date,
                COALESCE(SUM(b.stock_quantity_in_base_units), 0)::int AS stock
           FROM products p
           LEFT JOIN inventory_batches b
             ON b.product_id = p.id AND b.expiry_date > CURRENT_DATE
          GROUP BY p.id
         HAVING COALESCE(SUM(b.stock_quantity_in_base_units), 0) <= p.reorder_level
          ORDER BY stock ASC`),
      pool.query(
        `SELECT p.name, b.batch_number, b.expiry_date,
                b.stock_quantity_in_base_units AS stock
           FROM inventory_batches b
           JOIN products p ON p.id = b.product_id
          WHERE b.stock_quantity_in_base_units > 0
            AND b.expiry_date > CURRENT_DATE
            AND b.expiry_date <= CURRENT_DATE + $1::int
          ORDER BY b.expiry_date ASC`, [days]),
      pool.query(
        `SELECT p.name, b.batch_number, b.expiry_date,
                b.stock_quantity_in_base_units AS stock
           FROM inventory_batches b
           JOIN products p ON p.id = b.product_id
          WHERE b.stock_quantity_in_base_units > 0
            AND b.expiry_date <= CURRENT_DATE
          ORDER BY b.expiry_date ASC`)
    ]);

    const alerts = [
      ...expired.rows.map((r) => ({ ...r, alert_type: 'Expired' })),
      ...near.rows.map((r) => ({ ...r, alert_type: 'Near Expiry' })),
      ...low.rows.map((r) => ({ ...r, alert_type: 'Low Stock' }))
    ];

    res.json({ success: true, alerts });
  } catch (err) {
    console.error('Alerts error:', err);
    res.status(500).json({ success: false, message: 'Failed to load alerts' });
  }
};

// ---------- Suppliers ----------
exports.getSuppliers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, company_name, phone, current_balance FROM suppliers ORDER BY name');
    res.json({ success: true, suppliers: result.rows });
  } catch (err) {
    console.error('Get suppliers error:', err);
    res.status(500).json({ success: false, message: 'Failed to load suppliers' });
  }
};

exports.addSupplier = async (req, res) => {
  try {
    const { name, company_name, phone } = req.body;
    const result = await pool.query(
      `INSERT INTO suppliers (name, company_name, phone)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, company_name, phone]);
    res.status(201).json({ success: true, supplier: result.rows[0] });
  } catch (err) {
    console.error('Add supplier error:', err);
    res.status(500).json({ success: false, message: 'Failed to add supplier' });
  }
};

// ---------- Supplier khata ----------
exports.updateSupplierKhata = async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const { supplier_id, amount, transaction_type, description } = req.body;
    if (!['payment', 'credit'].includes(transaction_type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO supplier_ledger (supplier_id, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4)`,
      [supplier_id, amount, transaction_type, description || null]);
    // credit = humne udhaar liya (balance barhta), payment = humne diya (balance kam)
    const sign = transaction_type === 'credit' ? 1 : -1;
    await client.query(
      'UPDATE suppliers SET current_balance = current_balance + $1 WHERE id = $2',
      [sign * Number(amount), supplier_id]);
    await client.query('COMMIT');
    res.status(201).json({ success: true });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Khata error:', err);
    res.status(500).json({ success: false, message: 'Failed to update khata' });
  } finally {
    if (client) client.release();
  }
};

// ---------- Dashboard ----------
exports.getDashboardStats = async (req, res) => {
  try {
    const [today, products, low, expiring] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*)::int AS invoices
           FROM sales WHERE created_at::date = CURRENT_DATE`),
      pool.query('SELECT COUNT(*)::int AS count FROM products'),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM (
           SELECT p.id FROM products p
           LEFT JOIN inventory_batches b
             ON b.product_id = p.id AND b.expiry_date > CURRENT_DATE
           GROUP BY p.id
          HAVING COALESCE(SUM(b.stock_quantity_in_base_units), 0) <= p.reorder_level) t`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM inventory_batches
          WHERE stock_quantity_in_base_units > 0
            AND expiry_date <= CURRENT_DATE + 90`)
    ]);
    res.json({
      success: true,
      stats: {
        todayRevenue: Number(today.rows[0].revenue),
        todayInvoices: today.rows[0].invoices,
        totalProducts: products.rows[0].count,
        criticalAlerts: low.rows[0].count + expiring.rows[0].count
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};

console.log('PHARMACY EXPORTS:', Object.keys(module.exports));