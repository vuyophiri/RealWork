// Express app configuration separated for testing and server startup
const express = require('express');
const cors = require('cors');

// Exported app instance for reuse in server.js and tests
const app = express();

// Core middleware used in both runtime and tests
app.use(cors());
app.use(express.json());

// Route mounting mirrors the original server setup
app.get('/', (req, res) => res.send('RealWork API is running'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenders', require('./routes/tenders'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/vendors', require('./routes/vendors'));

module.exports = app;
