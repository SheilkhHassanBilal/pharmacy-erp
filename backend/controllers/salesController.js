const pool = require('../db');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

exports.checkout = async (req, res) => {
  const { items, discount = { type: 'flat', value: 0 }, payment_method = 'cash' } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'Cart is empty' });

  const merged = new Map();
  for (const it of items) {
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty <= 0)
      return res.status(400).json({ message: 'Invalid quantity' });
    merged.set(it.product_id, (merged.get(it.product_id) || 0) + qty);
  }
  const lines = [...merged.entries()]
    .map(([product_id, quantity]) => ({ product_id, quantity }))
    .sort((a, b) => a.product_id - b.product_id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const saleItems = [];
    let subtotal = 0;
    let totalTax = 0;

    for (const line of lines) {
      const { rows: [product] } = await client.query(
        'SELECT id, name, price, tax_rate FROM products WHERE id = $1', [line.product_id]);
      if (!product) throw { status: 404, message: `Product ${line.product_id} not found` };

      const { rows: batches } = await client.query(
        `SELECT id, quantity, cost_price
           FROM inventory_batches
          WHERE product_id = $1 AND quantity > 0 AND expiry_date > CURRENT_DATE
          ORDER BY expiry_date ASC, id ASC
          FOR UPDATE`, [line.product_id]);

      const available = batches.reduce((s, b) => s + b.quantity, 0);
      if (available < line.quantity)
        throw { status: 409, message: `Insufficient stock for ${product.name}. Available: ${available}` };

      let remaining = line.quantity;
      for (const batch of batches) {
        if (remaining === 0) break;
        const take = Math.min(batch.quantity, remaining);

        await client.query(
          'UPDATE inventory_batches SET quantity = quantity - $1 WHERE id = $2', [take, batch.id]);

        const unitPrice = Number(product.price);
        const lineNet = round2(unitPrice * take);
        const lineTax = round2(lineNet * Number(product.tax_rate) / 100);

        saleItems.push({
          product_id: product.id, batch_id: batch.id, quantity: take,
          unit_price: unitPrice, cost_price: Number(batch.cost_price),
          tax_amount: lineTax, line_total: round2(lineNet + lineTax),
        });
        subtotal += lineNet;
        totalTax += lineTax;
        remaining -= take;
      }
    }

    subtotal = round2(subtotal);
    totalTax = round2(totalTax);

    let discountAmt = discount.type === 'percent'
      ? round2(subtotal * Number(discount.value) / 100)
      : round2(Number(discount.value) || 0);
    discountAmt = Math.min(Math.max(discountAmt, 0), subtotal + totalTax);

    const total = round2(subtotal + totalTax - discountAmt);

    const { rows: [{ n }] } = await client.query(`SELECT nextval('invoice_seq') AS n`);
    const invoiceNo = `INV-${new Date().getFullYear()}-${n}`;

    const { rows: [sale] } = await client.query(
      `INSERT INTO sales (invoice_no, cashier_id, subtotal, discount, tax, total, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, invoice_no, created_at`,
      [invoiceNo, req.user?.id || null, subtotal, discountAmt, totalTax, total, payment_method]);

    for (const si of saleItems) {
      await client.query(
        `INSERT INTO sale_items
           (sale_id, product_id, batch_id, quantity, unit_price, cost_price, tax_amount, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [sale.id, si.product_id, si.batch_id, si.quantity, si.unit_price,
         si.cost_price, si.tax_amount, si.line_total]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      sale_id: sale.id, invoice_no: sale.invoice_no, created_at: sale.created_at,
      subtotal, tax: totalTax, discount: discountAmt, total,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Checkout error:', err);
    res.status(500).json({ message: 'Checkout failed' });
  } finally {
    client.release();
  }
};

exports.getInvoice = async (req, res) => {
  const { rows: [sale] } = await pool.query('SELECT * FROM sales WHERE id = $1', [req.params.id]);
  if (!sale) return res.status(404).json({ message: 'Invoice not found' });
  const { rows: items } = await pool.query(
    `SELECT si.*, p.name FROM sale_items si JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = $1`, [sale.id]);
  res.json({ ...sale, items });
};