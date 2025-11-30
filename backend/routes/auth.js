// Routes for user registration and login
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();
const router = express.Router();

// POST /api/auth/register
// Registers a new user.
// Allows clients to indicate role for publisher/applicant registration, but disallows creating admin via API for security.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Basic validation
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already used' });
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    
    // Only allow 'publisher' or default 'applicant' through registration endpoint
    // This prevents users from registering themselves as 'admin'
    const safeRole = (role === 'publisher') ? 'publisher' : 'applicant'
    
    const user = new User({ name, email, password: hashed, role: safeRole });
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
// Authenticates a user and returns a JWT token.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
