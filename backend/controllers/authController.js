const jwt = require('jsonwebtoken');
const pool = require('../db');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];
    if (!user || password !== user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      role: user.role,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};