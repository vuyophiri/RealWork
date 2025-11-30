// Authentication middleware: verify JWT and provide role checks
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Middleware to verify the JWT token in the Authorization header.
 * If valid, attaches the decoded user object (id, role) to req.user.
 */
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // Check if Authorization header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Middleware to restrict access to Admin users only.
 * Must be used AFTER the 'auth' middleware.
 */
const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
};

module.exports = { auth, adminOnly };
