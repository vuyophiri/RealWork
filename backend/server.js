// Entry point for the Express API
// This file sets up the server, connects to the database, and defines the main routes.

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON requests

// Basic health check route
app.get('/', (req, res) => res.send('RealWork API is running'));

// API Routes
app.use('/api/auth', require('./routes/auth')); // Authentication routes (login, register)
app.use('/api/tenders', require('./routes/tenders')); // Tender management routes
app.use('/api/applications', require('./routes/applications')); // Application submission routes
app.use('/api/vendors', require('./routes/vendors')); // Vendor profile management routes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
