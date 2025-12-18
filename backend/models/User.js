// Mongoose model for users
const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Roles: applicant (bidder), publisher (organization posting tenders), admin (superuser)
  role: { type: String, enum: ['applicant', 'publisher', 'admin'], default: 'applicant' },
  createdAt: { type: Date, default: Date.now }
});

// Export the User model
module.exports = mongoose.model('User', userSchema);
