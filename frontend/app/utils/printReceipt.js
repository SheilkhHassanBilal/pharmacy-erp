// 80mm thermal paper. 58mm printer ho to PAPER_WIDTH_MM = 58 kar dein.
const PAPER_WIDTH_MM = 80;

const SHOP = {
  name: 'PHARMACY ERP',
  address: 'Shop address yahan likhein',
  phone: 'Phone yahan likhein'
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => Number(n || 0).toFixed(2);

export function printReceipt(sale) {
  if (!sale || typeof window === 'undefined') return;

  const bodyWidth = PAPER_WIDTH_MM - 8;
  const fontSize = PAPER_WIDTH_MM <= 58 ? 11 : 12;

  const rows = (sale.items || [])
    .map((it) => {
      const qty = Number(it.quantity);
      const unit =
        it.unit_price != null ? Number(it.unit_price) : Number(it.line_total) / (qty || 1);
      return `
        <div class="item">
          <div>${esc(it.product_name)}</div>
          <div class="row"><span>${qty} x ${money(unit)}</span><span>${money(it.line_total)}</span></div>
        </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(sale.invoice_no)}</title>
  <style>
    @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      width: ${bodyWidth}mm;
      margin: 0 auto;
      padding: 3mm 0;
      font-family: 'Courier New', monospace;
      font-size: ${fontSize}px;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .shop { font-size: ${fontSize + 4}px; font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; }
    .item { margin-bottom: 4px; }
    .bold { font-weight: bold; }
    .grand { font-size: ${fontSize + 2}px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="center shop">${esc(SHOP.name)}</div>
  <div class="center">${esc(SHOP.address)}</div>
  <div class="center">${esc(SHOP.phone)}</div>
  <div class="line"></div>
  <div class="row"><span>Invoice:</span><span>${esc(sale.invoice_no)}</span></div>
  <div class="row"><span>Date:</span><span>${esc(new Date(sale.created_at || Date.now()).toLocaleString())}</span></div>
  <div class="row"><span>Payment:</span><span>${esc(String(sale.payment_method || '').toUpperCase())}</span></div>
  <div class="line"></div>
  ${rows}
  <div class="line"></div>
  <div class="row"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
  <div class="row"><span>Discount</span><span>${money(sale.discount)}</span></div>
  <div class="row"><span>Tax</span><span>${money(sale.tax)}</span></div>
  <div class="line"></div>
  <div class="row grand"><span>TOTAL (Rs.)</span><span>${money(sale.total)}</span></div>
  <div class="line"></div>
  <div class="center">Thank you! Get well soon.</div>
  <div class="center">Medicine wapas nahi hogi.</div>
  <br/>
</body>
</html>`;

  // Chhupa hua iframe: popup block nahi hota
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 300);
}