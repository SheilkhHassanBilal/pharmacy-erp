const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy_super_secret_key';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Token missing.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // { id, username, role }
    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Access forbidden: Admins only' });
    }
  });
};

module.exports = { verifyToken, verifyAdmin };