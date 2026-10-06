const express = require('express');
const cors = require('cors');
const path = require('path');

// backend/.env aur root/.env dono try karega
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);

const pharmacyRoutes = require('./routes/pharmacyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', require('./routes/posRoutes'));
app.use('/api/pharmacy', pharmacyRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Pharmacy ERP Backend running securely on port ${PORT}`);
});