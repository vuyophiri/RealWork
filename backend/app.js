// Express app configuration separated for testing and server startup
const express = require('express');
const cors = require('cors');

// Exported app instance for reuse in server.js and tests
const app = express();

// Core middleware used in both runtime and tests
app.use(cors());
app.use(express.json());

// Route mounting mirrors the original server setup
// Root for browser / health check
app.get('/', (req, res) => res.send('RealWork API is running'));

// Provide a simple API index at /api so visiting /api doesn't return "Cannot GET /api".
// This is helpful for humans and tools that probe the API root.
app.get('/api', (req, res) => {
	return res.json({
		message: 'RealWork API root',
		available: [
			'/api/auth',
			'/api/tenders',
			'/api/applications',
			'/api/vendors'
		]
	})
})
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenders', require('./routes/tenders'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/vendors', require('./routes/vendors'));

module.exports = app;
